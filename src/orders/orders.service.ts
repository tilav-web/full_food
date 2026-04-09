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
import { randomInt, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import type { PublicUser } from '../users/users.service';
import { DEFAULT_ORDER_DRAFT_TTL_SECONDS } from './order.constants';
import { CreateCheckoutDraftDto } from './dto/create-checkout-draft.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

type CheckoutDraftItem = {
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

type CheckoutDraftPayload = {
  draftId: string;
  userId: string;
  telegramId: string;
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
  items: CheckoutDraftItem[];
  summary: {
    totalItems: number;
    totalQuantity: number;
    subtotal: number;
    deliveryFee: number;
    totalPrice: number;
  };
  createdAt: string;
  expiresAt: string;
};

type CheckoutDraftResponse = {
  draftId: string;
  status: 'WAITING_LOCATION';
  expiresAt: Date;
  locationRequestSent: boolean;
  customer: CheckoutDraftPayload['customer'];
  delivery: CheckoutDraftPayload['delivery'];
  items: CheckoutDraftItem[];
  summary: CheckoutDraftPayload['summary'];
};

type CheckoutDraftEnvelope = {
  draft: CheckoutDraftResponse | null;
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

type FinalizeDraftResult =
  | {
      type: 'created';
      order: OrderResponse;
    }
  | {
      type: 'not_found';
    }
  | {
      type: 'processing';
    };

type OrderWithItems = Order & {
  items: OrderItem[];
};

type OrderNumberClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async createCheckoutDraft(
    user: PublicUser,
    dto: CreateCheckoutDraftDto,
  ): Promise<CheckoutDraftResponse> {
    const telegramId = user.telegramId?.trim();

    if (!telegramId) {
      throw new BadRequestException(
        'Checkout uchun Telegram akkaunti tizimga bog`langan bo`lishi kerak.',
      );
    }

    const existingDraft = await this.findActiveDraftByTelegramId(telegramId);

    if (existingDraft) {
      return this.toCheckoutDraftResponse(existingDraft);
    }

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

    let totalQuantity = 0;
    let subtotal = new Prisma.Decimal(0);

    const items = cartItems.map((cartItem) => {
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

    const createdAt = new Date();
    const expiresAt = new Date(
      createdAt.getTime() + this.getDraftTtlSeconds() * 1000,
    );
    const draft: CheckoutDraftPayload = {
      draftId: randomUUID(),
      userId: user.id,
      telegramId,
      customer: {
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      delivery: {
        addressLine: dto.addressLine.trim(),
        entrance: this.normalizeOptionalText(dto.entrance),
        floor: this.normalizeOptionalText(dto.floor),
        apartment: this.normalizeOptionalText(dto.apartment),
        note: this.normalizeOptionalText(dto.note),
      },
      items,
      summary: {
        totalItems: items.length,
        totalQuantity,
        subtotal: Number(subtotal),
        deliveryFee: 0,
        totalPrice: Number(subtotal),
      },
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await this.saveDraft(draft);

    return this.toCheckoutDraftResponse(draft);
  }

  async getActiveCheckoutDraft(
    user: PublicUser,
  ): Promise<CheckoutDraftEnvelope> {
    const telegramId = user.telegramId?.trim();

    if (!telegramId) {
      return { draft: null };
    }

    const draft = await this.findActiveDraftByTelegramId(telegramId);

    return {
      draft: draft ? this.toCheckoutDraftResponse(draft) : null,
    };
  }

  async cancelActiveCheckoutDraft(
    user: PublicUser,
  ): Promise<{ message: string }> {
    const telegramId = user.telegramId?.trim();

    if (!telegramId) {
      return {
        message: 'Aktiv checkout draft topilmadi.',
      };
    }

    const draft = await this.findActiveDraftByTelegramId(telegramId);

    if (!draft) {
      return {
        message: 'Aktiv checkout draft topilmadi.',
      };
    }

    await this.deleteDraft(draft.draftId, draft.telegramId);

    return {
      message: 'Checkout draft bekor qilindi.',
    };
  }

  async finalizeDraftFromTelegramLocation(
    telegramId: string,
    location: {
      latitude: number;
      longitude: number;
    },
  ): Promise<FinalizeDraftResult> {
    const normalizedTelegramId = telegramId.trim();
    const draft = await this.findActiveDraftByTelegramId(normalizedTelegramId);

    if (!draft) {
      return {
        type: 'not_found',
      };
    }

    const lockKey = this.getDraftLockKey(draft.draftId);
    const isLocked = await this.redisService.setIfNotExists(lockKey, '1', 30);

    if (!isLocked) {
      return {
        type: 'processing',
      };
    }

    try {
      const freshDraft =
        await this.findActiveDraftByTelegramId(normalizedTelegramId);

      if (!freshDraft) {
        return {
          type: 'not_found',
        };
      }

      const order = await this.prisma.$transaction(async (transaction) => {
        const orderNumber = await this.generateOrderNumber(transaction);
        const draftQuantityByProductId = new Map(
          freshDraft.items.map((item) => [item.productId, item.quantity]),
        );

        const createdOrder = await transaction.order.create({
          data: {
            orderNumber,
            userId: freshDraft.userId,
            status: OrderStatus.NEW,
            paymentStatus: PaymentStatus.PENDING,
            locationSource: OrderLocationSource.BOT_LOCATION,
            latitude: location.latitude,
            longitude: location.longitude,
            locationReceivedAt: new Date(),
            customerPhone: freshDraft.customer.phone,
            customerFirstName: freshDraft.customer.firstName,
            customerLastName: freshDraft.customer.lastName,
            addressLine: freshDraft.delivery.addressLine,
            entrance: freshDraft.delivery.entrance,
            floor: freshDraft.delivery.floor,
            apartment: freshDraft.delivery.apartment,
            note: freshDraft.delivery.note,
            subtotal: new Prisma.Decimal(freshDraft.summary.subtotal),
            deliveryFee: new Prisma.Decimal(freshDraft.summary.deliveryFee),
            totalPrice: new Prisma.Decimal(freshDraft.summary.totalPrice),
            items: {
              create: freshDraft.items.map((item) => ({
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
            userId: freshDraft.userId,
            productId: {
              in: freshDraft.items.map((item) => item.productId),
            },
          },
        });

        for (const cartItem of currentCartItems) {
          const draftQuantity = draftQuantityByProductId.get(
            cartItem.productId,
          );

          if (!draftQuantity) {
            continue;
          }

          if (cartItem.quantity > draftQuantity) {
            await transaction.cartItem.update({
              where: {
                userId_productId: {
                  userId: freshDraft.userId,
                  productId: cartItem.productId,
                },
              },
              data: {
                quantity: {
                  decrement: draftQuantity,
                },
              },
            });
            continue;
          }

          await transaction.cartItem.delete({
            where: {
              userId_productId: {
                userId: freshDraft.userId,
                productId: cartItem.productId,
              },
            },
          });
        }

        return createdOrder;
      });

      await this.deleteDraft(freshDraft.draftId, freshDraft.telegramId);

      return {
        type: 'created',
        order: this.toOrderResponse(order),
      };
    } finally {
      await this.redisService.delete(lockKey);
    }
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

  private async saveDraft(draft: CheckoutDraftPayload): Promise<void> {
    const ttlSeconds = this.getDraftTtlSeconds();

    await this.redisService.set(
      this.getDraftKey(draft.draftId),
      JSON.stringify(draft),
      ttlSeconds,
    );
    await this.redisService.set(
      this.getActiveDraftKey(draft.telegramId),
      draft.draftId,
      ttlSeconds,
    );
  }

  private async findActiveDraftByTelegramId(
    telegramId: string,
  ): Promise<CheckoutDraftPayload | null> {
    const draftId = await this.redisService.get(
      this.getActiveDraftKey(telegramId),
    );

    if (!draftId) {
      return null;
    }

    const rawDraft = await this.redisService.get(this.getDraftKey(draftId));

    if (!rawDraft) {
      await this.redisService.delete(this.getActiveDraftKey(telegramId));
      return null;
    }

    try {
      return JSON.parse(rawDraft) as CheckoutDraftPayload;
    } catch {
      await this.deleteDraft(draftId, telegramId);
      return null;
    }
  }

  private async deleteDraft(
    draftId: string,
    telegramId: string,
  ): Promise<void> {
    await this.redisService.delete(
      this.getDraftKey(draftId),
      this.getActiveDraftKey(telegramId),
      this.getDraftLockKey(draftId),
    );
  }

  private toCheckoutDraftResponse(
    draft: CheckoutDraftPayload,
  ): CheckoutDraftResponse {
    return {
      draftId: draft.draftId,
      status: 'WAITING_LOCATION',
      expiresAt: new Date(draft.expiresAt),
      locationRequestSent: false,
      customer: draft.customer,
      delivery: draft.delivery,
      items: draft.items,
      summary: draft.summary,
    };
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

  private getDraftTtlSeconds(): number {
    const rawValue = Number(process.env.ORDER_DRAFT_TTL_SECONDS);

    if (Number.isFinite(rawValue) && rawValue > 0) {
      return rawValue;
    }

    return DEFAULT_ORDER_DRAFT_TTL_SECONDS;
  }

  private getDraftKey(draftId: string): string {
    return `order:draft:${draftId}`;
  }

  private getActiveDraftKey(telegramId: string): string {
    return `order:draft:active:${telegramId}`;
  }

  private getDraftLockKey(draftId: string): string {
    return `order:draft:lock:${draftId}`;
  }

  private normalizeOptionalText(value?: string): string | null {
    const normalizedValue = value?.trim();

    return normalizedValue ? normalizedValue : null;
  }
}
