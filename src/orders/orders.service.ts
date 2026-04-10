import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  Order,
  OrderItem,
  OrderLocationSource,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { PublicUser } from '../users/users.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

type CheckoutItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: {
    id: string;
    image: string;
    name: string;
    description: string;
    categoryId: string;
    category: {
      id: string;
      image: string;
      name: string;
    };
  };
};

type OrderResponse = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  customer: {
    phone: string;
    firstName: string;
    lastName: string;
  };
  delivery: {
    addressLine: string;
    entrance: string | null;
    floor: string | null;
    apartment: string | null;
    note: string | null;
  };
  location: {
    source: OrderLocationSource;
    latitude: number;
    longitude: number;
    receivedAt: Date;
  };
  items: Array<{
    id: string;
    productId: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    product: {
      image: string;
      name: string;
      description: string;
      categoryId: string | null;
      categoryImage: string;
      categoryName: string;
    };
  }>;
  summary: {
    totalItems: number;
    totalQuantity: number;
    subtotal: number;
    deliveryFee: number;
    totalPrice: number;
  };
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PaginatedOrdersResponse = {
  data: OrderResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type OrderWithItems = Order & {
  items: OrderItem[];
};

type OrderNumberClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async checkout(
    user: PublicUser,
    dto: CreateCheckoutDto,
  ): Promise<OrderResponse> {
    const cartItems = await this.prisma.cartItem.findMany({
      where: {
        userId: user.id,
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException(
        'Checkout qilish uchun savat bo`sh bo`lmasligi kerak.',
      );
    }

    const inactiveCartItem = cartItems.find(
      (cartItem) => !cartItem.product.isActive,
    );

    if (inactiveCartItem) {
      throw new BadRequestException(
        `\`${inactiveCartItem.product.name}\` active emas. Checkout oldidan savatni yangilang.`,
      );
    }

    const addressLine = dto.addressLine.trim();

    if (addressLine.length < 5) {
      throw new BadRequestException(
        'Yetkazib berish manzili kamida 5 ta belgidan iborat bo`lishi kerak.',
      );
    }

    let totalQuantity = 0;
    let subtotal = new Prisma.Decimal(0);

    const items: CheckoutItem[] = cartItems.map((cartItem) => {
      const unitPrice = new Prisma.Decimal(cartItem.product.price);
      const lineTotal = unitPrice.mul(cartItem.quantity);

      totalQuantity += cartItem.quantity;
      subtotal = subtotal.add(lineTotal);

      return {
        productId: cartItem.productId,
        quantity: cartItem.quantity,
        unitPrice: Number(unitPrice),
        lineTotal: Number(lineTotal),
        product: {
          id: cartItem.product.id,
          image: cartItem.product.image,
          name: cartItem.product.name,
          description: cartItem.product.description,
          categoryId: cartItem.product.categoryId,
          category: {
            id: cartItem.product.category.id,
            image: cartItem.product.category.image,
            name: cartItem.product.category.name,
          },
        },
      };
    });

    const itemQuantityByProductId = new Map(
      items.map((item) => [item.productId, item.quantity]),
    );
    const locationReceivedAt = new Date();

    const order = await this.prisma.$transaction(async (transaction) => {
      const orderNumber = await this.generateOrderNumber(transaction);

      const createdOrder = await transaction.order.create({
        data: {
          orderNumber,
          userId: user.id,
          status: OrderStatus.NEW,
          paymentStatus: PaymentStatus.PENDING,
          locationSource: OrderLocationSource.MINI_APP,
          latitude: dto.latitude,
          longitude: dto.longitude,
          locationReceivedAt,
          customerPhone: user.phone,
          customerFirstName: user.firstName,
          customerLastName: user.lastName,
          addressLine,
          entrance: this.normalizeOptionalText(dto.entrance),
          floor: this.normalizeOptionalText(dto.floor),
          apartment: this.normalizeOptionalText(dto.apartment),
          note: this.normalizeOptionalText(dto.note),
          subtotal,
          deliveryFee: new Prisma.Decimal(0),
          totalPrice: subtotal,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              productImage: item.product.image,
              productName: item.product.name,
              productDescription: item.product.description,
              categoryId: item.product.categoryId,
              categoryImage: item.product.category.image,
              categoryName: item.product.category.name,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              quantity: item.quantity,
              lineTotal: new Prisma.Decimal(item.lineTotal),
            })),
          },
        },
        include: {
          items: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      const currentCartItems = await transaction.cartItem.findMany({
        where: {
          userId: user.id,
          productId: {
            in: items.map((item) => item.productId),
          },
        },
      });

      for (const cartItem of currentCartItems) {
        const checkoutQuantity = itemQuantityByProductId.get(
          cartItem.productId,
        );

        if (!checkoutQuantity) {
          continue;
        }

        if (cartItem.quantity > checkoutQuantity) {
          await transaction.cartItem.update({
            where: {
              userId_productId: {
                userId: user.id,
                productId: cartItem.productId,
              },
            },
            data: {
              quantity: {
                decrement: checkoutQuantity,
              },
            },
          });
          continue;
        }

        await transaction.cartItem.delete({
          where: {
            userId_productId: {
              userId: user.id,
              productId: cartItem.productId,
            },
          },
        });
      }

      return createdOrder;
    });

    return this.toOrderResponse(order);
  }

  async listMyOrders(
    user: PublicUser,
    query: ListOrdersQueryDto,
  ): Promise<PaginatedOrdersResponse> {
    return this.listOrdersInternal(query, {
      userId: user.id,
    });
  }

  async findMyOrder(user: PublicUser, id: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order topilmadi.');
    }

    return this.toOrderResponse(order);
  }

  async listOrders(
    query: ListOrdersQueryDto,
  ): Promise<PaginatedOrdersResponse> {
    return this.listOrdersInternal(query);
  }

  async findOrder(id: string): Promise<OrderResponse> {
    const order = await this.findOrderByIdOrThrow(id);

    return this.toOrderResponse(order);
  }

  async updateOrderStatus(
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderResponse> {
    const order = await this.findOrderByIdOrThrow(id);

    if (dto.status === OrderStatus.CANCELLED) {
      const cancelReason = dto.cancelReason?.trim();

      if (!cancelReason) {
        throw new BadRequestException(
          'Order bekor qilinganda cancelReason yuborilishi kerak.',
        );
      }

      if (order.status === OrderStatus.COMPLETED) {
        throw new BadRequestException(
          'Completed orderni bekor qilib bo`lmaydi.',
        );
      }

      if (order.status === OrderStatus.CANCELLED) {
        const updatedOrder = await this.prisma.order.update({
          where: { id },
          data: {
            cancelReason,
            paymentStatus: PaymentStatus.CANCELLED,
          },
          include: {
            items: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        });

        return this.toOrderResponse(updatedOrder);
      }

      const cancelledOrder = await this.prisma.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.CANCELLED,
          cancelReason,
        },
        include: {
          items: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      return this.toOrderResponse(cancelledOrder);
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Bekor qilingan order statusini qayta o`zgartirib bo`lmaydi.',
      );
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'Completed order statusini qayta o`zgartirib bo`lmaydi.',
      );
    }

    if (order.status !== dto.status) {
      this.ensureStatusTransitionAllowed(order.status, dto.status);
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        cancelReason: null,
      },
      include: {
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return this.toOrderResponse(updatedOrder);
  }

  async updatePaymentStatus(
    id: string,
    dto: UpdatePaymentStatusDto,
  ): Promise<OrderResponse> {
    if (dto.paymentStatus === PaymentStatus.CANCELLED) {
      throw new BadRequestException(
        'Payment `CANCELLED` statusi order bekor qilinganda avtomatik qo`yiladi.',
      );
    }

    const order = await this.findOrderByIdOrThrow(id);

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Bekor qilingan order uchun to`lov statusini alohida o`zgartirib bo`lmaydi.',
      );
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        paymentStatus: dto.paymentStatus,
      },
      include: {
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return this.toOrderResponse(updatedOrder);
  }

  private async listOrdersInternal(
    query: ListOrdersQueryDto,
    options?: {
      userId?: string;
    },
  ): Promise<PaginatedOrdersResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();

    const where: Prisma.OrderWhereInput = {
      userId: options?.userId,
      status: query.status,
      paymentStatus: query.paymentStatus,
      OR: search
        ? [
            {
              orderNumber: {
                contains: search,
              },
            },
            {
              customerPhone: {
                contains: search,
              },
            },
            {
              customerFirstName: {
                contains: search,
              },
            },
            {
              customerLastName: {
                contains: search,
              },
            },
            {
              addressLine: {
                contains: search,
              },
            },
          ]
        : undefined,
    };

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      data: orders.map((order) => this.toOrderResponse(order)),
      meta: {
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  private async findOrderByIdOrThrow(id: string): Promise<OrderWithItems> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order topilmadi.');
    }

    return order;
  }

  private async generateOrderNumber(
    client: OrderNumberClient,
  ): Promise<string> {
    const datePart = new Date().toISOString().slice(0, 10).replaceAll('-', '');

    for (let index = 0; index < 10; index += 1) {
      const orderNumber = `FF-${datePart}-${randomInt(100000, 999999)}`;
      const existingOrder = await client.order.findUnique({
        where: {
          orderNumber,
        },
        select: {
          id: true,
        },
      });

      if (!existingOrder) {
        return orderNumber;
      }
    }

    throw new InternalServerErrorException(
      'Order raqamini yaratib bo`lmadi. Qayta urinib ko`ring.',
    );
  }

  private ensureStatusTransitionAllowed(
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
  ) {
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.NEW]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
      [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!allowedTransitions[currentStatus].includes(nextStatus)) {
      throw new BadRequestException(
        'Order statusini ' +
          currentStatus +
          ' dan ' +
          nextStatus +
          " ga o'tkazib bo'lmaydi.",
      );
    }
  }

  private toOrderResponse(order: OrderWithItems): OrderResponse {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      customer: {
        phone: order.customerPhone,
        firstName: order.customerFirstName,
        lastName: order.customerLastName,
      },
      delivery: {
        addressLine: order.addressLine,
        entrance: order.entrance,
        floor: order.floor,
        apartment: order.apartment,
        note: order.note,
      },
      location: {
        source: order.locationSource,
        latitude: order.latitude,
        longitude: order.longitude,
        receivedAt: order.locationReceivedAt,
      },
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
        product: {
          image: item.productImage,
          name: item.productName,
          description: item.productDescription,
          categoryId: item.categoryId,
          categoryImage: item.categoryImage,
          categoryName: item.categoryName,
        },
      })),
      summary: {
        totalItems: order.items.length,
        totalQuantity: order.items.reduce(
          (total, item) => total + item.quantity,
          0,
        ),
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.deliveryFee),
        totalPrice: Number(order.totalPrice),
      },
      cancelReason: order.cancelReason,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private normalizeOptionalText(value?: string): string | null {
    const normalizedValue = value?.trim();

    return normalizedValue ? normalizedValue : null;
  }
}
