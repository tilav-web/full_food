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
  OrderSource,
  OrderStatus,
  PaymentStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { randomInt } from 'node:crypto';
import { BotService } from '../bot/bot.service';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeUzbekPhoneNumber } from '../users/phone.util';
import type { PublicUser } from '../users/users.service';
import { CreateAdminOrderDto } from './dto/create-admin-order.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: true };
}>;

type PreparedOrderItem = {
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
  source: OrderSource;
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

type DeliveryPayload = {
  addressLine: string;
  entrance: string | null;
  floor: string | null;
  apartment: string | null;
  note: string | null;
};

type OrderCreationPayload = {
  userId: string | null;
  createdByStaffId: string | null;
  source: OrderSource;
  paymentStatus: PaymentStatus;
  location: {
    source: OrderLocationSource;
    latitude: number;
    longitude: number;
  };
  customer: {
    phone: string;
    firstName: string;
    lastName: string;
  };
  delivery: DeliveryPayload;
  items: PreparedOrderItem[];
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly botService: BotService,
  ) {}

  async checkout(
    user: PublicUser,
    dto: CreateCheckoutDto,
  ): Promise<OrderResponse> {
    const items = await this.getPreparedCartItems(user.id);
    const delivery = this.normalizeDelivery(dto);

    const order = await this.prisma.$transaction(async (transaction) => {
      await this.decrementStockForItems(transaction, items);

      const createdOrder = await this.createOrderRecord(transaction, {
        userId: user.id,
        createdByStaffId: null,
        source: OrderSource.MINI_APP,
        paymentStatus: PaymentStatus.PENDING,
        location: {
          source: OrderLocationSource.MINI_APP,
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
        customer: {
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        delivery,
        items,
      });

      await transaction.cartItem.deleteMany({
        where: {
          userId: user.id,
        },
      });

      return createdOrder;
    });

    await this.notifyOrderCreated(order);
    return this.toOrderResponse(order);
  }

  async createAdminOrder(
    staffUser: PublicUser,
    dto: CreateAdminOrderDto,
  ): Promise<OrderResponse> {
    const paymentStatus = dto.paymentStatus ?? PaymentStatus.PENDING;

    if (paymentStatus === PaymentStatus.CANCELLED) {
      throw new BadRequestException(
        'Order create vaqtida payment `CANCELLED` bo`lishi mumkin emas.',
      );
    }

    const customerUserId = await this.resolveCustomerUserId(dto.customerUserId);
    const items = await this.getPreparedRequestedItems(dto.items);
    const delivery = this.normalizeDelivery(dto);

    const order = await this.prisma.$transaction(async (transaction) => {
      await this.decrementStockForItems(transaction, items);

      return this.createOrderRecord(transaction, {
        userId: customerUserId,
        createdByStaffId: staffUser.id,
        source: OrderSource.CASHIER_PANEL,
        paymentStatus,
        location: {
          source: OrderLocationSource.ADMIN_PANEL,
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
        customer: {
          phone: this.normalizeCustomerPhone(dto.customerPhone),
          firstName: this.normalizeRequiredText(
            dto.customerFirstName,
            'Mijoz ismi yuborilishi kerak.',
          ),
          lastName: this.normalizeRequiredText(
            dto.customerLastName,
            'Mijoz familiyasi yuborilishi kerak.',
          ),
        },
        delivery,
        items,
      });
    });

    await this.notifyOrderCreated(order);
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
      source: query.source,
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

  private async getPreparedCartItems(
    userId: string,
  ): Promise<PreparedOrderItem[]> {
    const cartItems = await this.prisma.cartItem.findMany({
      where: {
        userId,
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

    return cartItems.map((cartItem) =>
      this.toPreparedOrderItem(cartItem.product, cartItem.quantity),
    );
  }

  private async getPreparedRequestedItems(
    rawItems: CreateAdminOrderDto['items'],
  ): Promise<PreparedOrderItem[]> {
    const quantityByProductId = new Map<string, number>();

    for (const item of rawItems) {
      const productId = item.productId.trim();

      if (!productId) {
        throw new BadRequestException('Product ID bo`sh bo`lishi mumkin emas.');
      }

      quantityByProductId.set(
        productId,
        (quantityByProductId.get(productId) ?? 0) + item.quantity,
      );
    }

    const productIds = Array.from(quantityByProductId.keys());
    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      include: {
        category: true,
      },
    });

    if (products.length !== productIds.length) {
      const productIdSet = new Set(products.map((product) => product.id));
      const missingProductId = productIds.find(
        (productId) => !productIdSet.has(productId),
      );

      throw new NotFoundException(
        missingProductId
          ? `Product topilmadi: ${missingProductId}.`
          : 'Product topilmadi.',
      );
    }

    const productById = new Map(
      products.map((product) => [product.id, product]),
    );

    return productIds.map((productId) => {
      const product = productById.get(productId);

      if (!product) {
        throw new NotFoundException('Product topilmadi.');
      }

      return this.toPreparedOrderItem(
        product,
        quantityByProductId.get(productId) ?? 0,
      );
    });
  }

  private toPreparedOrderItem(
    product: ProductWithCategory,
    quantity: number,
  ): PreparedOrderItem {
    if (!product.isActive) {
      throw new BadRequestException(
        `\`${product.name}\` active emas. Order yaratishdan oldin productni tekshiring.`,
      );
    }

    if (product.stockQuantity < quantity) {
      throw new BadRequestException(
        `\`${product.name}\` omborda yetarli emas.`,
      );
    }

    const unitPrice = new Prisma.Decimal(product.price);
    const lineTotal = unitPrice.mul(quantity);

    return {
      productId: product.id,
      quantity,
      unitPrice: Number(unitPrice),
      lineTotal: Number(lineTotal),
      product: {
        id: product.id,
        image: product.image,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        category: {
          id: product.category.id,
          image: product.category.image,
          name: product.category.name,
        },
      },
    };
  }

  private async decrementStockForItems(
    transaction: Prisma.TransactionClient,
    items: PreparedOrderItem[],
  ): Promise<void> {
    for (const item of items) {
      const product = await transaction.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          stockQuantity: true,
        },
      });

      if (!product) {
        throw new NotFoundException('Product topilmadi.');
      }

      if (product.stockQuantity < item.quantity) {
        throw new BadRequestException(
          `\`${item.product.name}\` omborda yetarli emas.`,
        );
      }

      const nextStock = product.stockQuantity - item.quantity;

      await transaction.product.update({
        where: { id: product.id },
        data: {
          stockQuantity: nextStock,
          isActive: nextStock > 0,
        },
      });
    }
  }

  private async notifyOrderCreated(order: OrderWithItems): Promise<void> {
    const totalPrice = order.items.reduce(
      (sum, item) => sum.add(new Prisma.Decimal(item.lineTotal)),
      new Prisma.Decimal(0),
    );

    await this.botService.sendOrderNotification({
      orderNumber: order.orderNumber,
      source: order.source,
      customerName: `${order.customerFirstName} ${order.customerLastName}`.trim(),
      customerPhone: order.customerPhone,
      addressLine: order.addressLine,
      entrance: order.entrance,
      floor: order.floor,
      apartment: order.apartment,
      totalPrice: Number(totalPrice),
      itemsCount: order.items.length,
    });
  }

  private async createOrderRecord(
    transaction: Prisma.TransactionClient,
    payload: OrderCreationPayload,
  ): Promise<OrderWithItems> {
    const orderNumber = await this.generateOrderNumber(transaction);
    const locationReceivedAt = new Date();
    let subtotal = new Prisma.Decimal(0);

    for (const item of payload.items) {
      subtotal = subtotal.add(new Prisma.Decimal(item.lineTotal));
    }

    return transaction.order.create({
      data: {
        orderNumber,
        userId: payload.userId,
        createdByStaffId: payload.createdByStaffId,
        source: payload.source,
        status: OrderStatus.NEW,
        paymentStatus: payload.paymentStatus,
        locationSource: payload.location.source,
        latitude: payload.location.latitude,
        longitude: payload.location.longitude,
        locationReceivedAt,
        customerPhone: payload.customer.phone,
        customerFirstName: payload.customer.firstName,
        customerLastName: payload.customer.lastName,
        addressLine: payload.delivery.addressLine,
        entrance: payload.delivery.entrance,
        floor: payload.delivery.floor,
        apartment: payload.delivery.apartment,
        note: payload.delivery.note,
        subtotal,
        deliveryFee: new Prisma.Decimal(0),
        totalPrice: subtotal,
        items: {
          create: payload.items.map((item) => ({
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
  }

  private async resolveCustomerUserId(
    rawCustomerUserId?: string,
  ): Promise<string | null> {
    const customerUserId = rawCustomerUserId?.trim();

    if (!customerUserId) {
      return null;
    }

    const customerUser = await this.prisma.user.findUnique({
      where: {
        id: customerUserId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!customerUser) {
      throw new NotFoundException('Mijoz user topilmadi.');
    }

    if (customerUser.role !== Role.USER) {
      throw new BadRequestException(
        'Customer user sifatida faqat oddiy user tanlanishi mumkin.',
      );
    }

    return customerUser.id;
  }

  private normalizeDelivery(
    dto: Pick<
      CreateCheckoutDto,
      'addressLine' | 'entrance' | 'floor' | 'apartment' | 'note'
    >,
  ): DeliveryPayload {
    const addressLine = dto.addressLine.trim();

    if (addressLine.length < 5) {
      throw new BadRequestException(
        'Yetkazib berish manzili kamida 5 ta belgidan iborat bo`lishi kerak.',
      );
    }

    return {
      addressLine,
      entrance: this.normalizeOptionalText(dto.entrance),
      floor: this.normalizeOptionalText(dto.floor),
      apartment: this.normalizeOptionalText(dto.apartment),
      note: this.normalizeOptionalText(dto.note),
    };
  }

  private normalizeCustomerPhone(rawPhone: string): string {
    try {
      return normalizeUzbekPhoneNumber(rawPhone);
    } catch {
      throw new BadRequestException(
        'Mijoz telefoni 9 xonali formatda yuborilishi kerak.',
      );
    }
  }

  private normalizeRequiredText(value: string, errorMessage: string): string {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      throw new BadRequestException(errorMessage);
    }

    return normalizedValue;
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
      source: order.source,
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
