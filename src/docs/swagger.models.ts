import {
  OrderLocationSource,
  OrderStatus,
  PaymentStatus,
  Role,
} from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDoc {
  @ApiProperty({
    example: "Product muvaffaqiyatli o'chirildi.",
  })
  message!: string;
}

export class SessionMessageResponseDoc {
  @ApiProperty({
    example: 'Session yopildi.',
  })
  message!: string;
}

export class CheckoutDraftMessageResponseDoc {
  @ApiProperty({
    example: 'Checkout draft bekor qilindi.',
  })
  message!: string;
}

export class PublicUserResponseDoc {
  @ApiProperty({
    example: 'cmnr0w2hq0000p60d15udg25w',
  })
  id!: string;

  @ApiProperty({
    example: '123456789',
    nullable: true,
  })
  telegramId!: string | null;

  @ApiProperty({
    example: 'full_food_user',
    nullable: true,
  })
  telegramUsername!: string | null;

  @ApiProperty({
    example: '777422302',
  })
  phone!: string;

  @ApiProperty({
    example: 'Ali',
  })
  firstName!: string;

  @ApiProperty({
    example: 'Valiyev',
  })
  lastName!: string;

  @ApiProperty({
    enum: Role,
    example: Role.USER,
  })
  role!: Role;

  @ApiProperty({
    example: '2026-04-09T05:14:46.814Z',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-04-09T05:14:46.814Z',
  })
  updatedAt!: string;
}

export class PasswordLoginResponseDoc {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbW56ZDh4d2QwMDAycDZmMG44eXoxYWJjIiwicm9sZSI6IlNVUEVSX0FETUlOIn0.signature',
  })
  accessToken!: string;

  @ApiProperty({
    type: () => PublicUserResponseDoc,
  })
  user!: PublicUserResponseDoc;
}

export class TelegramInitDataUserDoc {
  @ApiProperty({
    example: 123456789,
  })
  id!: number;

  @ApiProperty({
    example: 'Ali',
    required: false,
  })
  first_name?: string;

  @ApiProperty({
    example: 'Valiyev',
    required: false,
  })
  last_name?: string;

  @ApiProperty({
    example: 'full_food_user',
    required: false,
  })
  username?: string;

  @ApiProperty({
    example: 'uz',
    required: false,
  })
  language_code?: string;

  @ApiProperty({
    example: true,
    required: false,
  })
  allows_write_to_pm?: boolean;

  @ApiProperty({
    example: 'https://t.me/i/userpic/320/example.jpg',
    required: false,
  })
  photo_url?: string;
}

export class VerifyTelegramInitDataResponseDoc {
  @ApiProperty({
    example: true,
  })
  valid!: boolean;

  @ApiProperty({
    example: true,
  })
  isRegistered!: boolean;

  @ApiProperty({
    type: () => TelegramInitDataUserDoc,
  })
  telegramUser!: TelegramInitDataUserDoc;

  @ApiProperty({
    type: () => PublicUserResponseDoc,
    nullable: true,
  })
  user!: PublicUserResponseDoc | null;
}

export class CategoryResponseDoc {
  @ApiProperty({
    example: 'cmnzd2aqf0001p6f0s2lm8abc',
  })
  id!: string;

  @ApiProperty({
    example: 'https://cdn.fullfood.uz/categories/burger.png',
  })
  image!: string;

  @ApiProperty({
    example: 'Burgerlar',
  })
  name!: string;
}

export class ProductResponseDoc {
  @ApiProperty({
    example: 'cmnzd8xwd0002p6f0n8yz1abc',
  })
  id!: string;

  @ApiProperty({
    example: 'https://cdn.fullfood.uz/products/cheeseburger.png',
  })
  image!: string;

  @ApiProperty({
    example: 'Cheeseburger',
  })
  name!: string;

  @ApiProperty({
    example: "Mol go'shti, cheddar pishloq va maxsus sous bilan.",
  })
  description!: string;

  @ApiProperty({
    example: 32000,
  })
  price!: number;

  @ApiProperty({
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    example: 'cmnzd2aqf0001p6f0s2lm8abc',
  })
  categoryId!: string;

  @ApiProperty({
    type: () => CategoryResponseDoc,
  })
  category!: CategoryResponseDoc;

  @ApiProperty({
    example: '2026-04-10T10:15:20.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-04-10T10:15:20.000Z',
  })
  updatedAt!: string;
}

export class PaginationMetaDoc {
  @ApiProperty({
    example: 24,
  })
  total!: number;

  @ApiProperty({
    example: 1,
  })
  page!: number;

  @ApiProperty({
    example: 10,
  })
  limit!: number;

  @ApiProperty({
    example: 3,
  })
  totalPages!: number;
}

export class ProductListResponseDoc {
  @ApiProperty({
    type: () => [ProductResponseDoc],
  })
  data!: ProductResponseDoc[];

  @ApiProperty({
    type: () => PaginationMetaDoc,
  })
  meta!: PaginationMetaDoc;
}

export class CartProductResponseDoc {
  @ApiProperty({
    example: 'cmnzd8xwd0002p6f0n8yz1abc',
  })
  id!: string;

  @ApiProperty({
    example: 'https://cdn.fullfood.uz/products/cheeseburger.png',
  })
  image!: string;

  @ApiProperty({
    example: 'Cheeseburger',
  })
  name!: string;

  @ApiProperty({
    example: "Mol go'shti, cheddar pishloq va maxsus sous bilan.",
  })
  description!: string;

  @ApiProperty({
    example: 32000,
  })
  price!: number;

  @ApiProperty({
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    example: 'cmnzd2aqf0001p6f0s2lm8abc',
  })
  categoryId!: string;

  @ApiProperty({
    type: () => CategoryResponseDoc,
  })
  category!: CategoryResponseDoc;
}

export class CartItemResponseDoc {
  @ApiProperty({
    example: 'cmnzg3v9u0003p6f0o4hi3abc',
  })
  id!: string;

  @ApiProperty({
    example: 'cmnzd8xwd0002p6f0n8yz1abc',
  })
  productId!: string;

  @ApiProperty({
    example: 2,
  })
  quantity!: number;

  @ApiProperty({
    example: 32000,
  })
  unitPrice!: number;

  @ApiProperty({
    example: 64000,
  })
  lineTotal!: number;

  @ApiProperty({
    type: () => CartProductResponseDoc,
  })
  product!: CartProductResponseDoc;
}

export class CartSummaryResponseDoc {
  @ApiProperty({
    example: 3,
  })
  totalItems!: number;

  @ApiProperty({
    example: 5,
  })
  totalQuantity!: number;

  @ApiProperty({
    example: 146000,
  })
  totalPrice!: number;
}

export class CartResponseDoc {
  @ApiProperty({
    type: () => [CartItemResponseDoc],
  })
  items!: CartItemResponseDoc[];

  @ApiProperty({
    type: () => CartSummaryResponseDoc,
  })
  summary!: CartSummaryResponseDoc;
}

export class CheckoutDraftCustomerDoc {
  @ApiProperty({
    example: '777422302',
  })
  phone!: string;

  @ApiProperty({
    example: 'Ali',
  })
  firstName!: string;

  @ApiProperty({
    example: 'Valiyev',
  })
  lastName!: string;
}

export class CheckoutDraftDeliveryDoc {
  @ApiProperty({
    example: 'Toshkent shahar, Chilonzor 5-daha, 12-uy',
  })
  addressLine!: string;

  @ApiProperty({
    example: '2-podyezd',
    nullable: true,
  })
  entrance!: string | null;

  @ApiProperty({
    example: '4-qavat',
    nullable: true,
  })
  floor!: string | null;

  @ApiProperty({
    example: '27-xonadon',
    nullable: true,
  })
  apartment!: string | null;

  @ApiProperty({
    example: 'Domofonni bosing.',
    nullable: true,
  })
  note!: string | null;
}

export class CheckoutDraftItemDoc {
  @ApiProperty({
    example: 'cmnzd8xwd0002p6f0n8yz1abc',
  })
  productId!: string;

  @ApiProperty({
    example: 2,
  })
  quantity!: number;

  @ApiProperty({
    example: 32000,
  })
  unitPrice!: number;

  @ApiProperty({
    example: 64000,
  })
  lineTotal!: number;

  @ApiProperty({
    type: () => CartProductResponseDoc,
  })
  product!: CartProductResponseDoc;
}

export class CheckoutDraftSummaryDoc {
  @ApiProperty({
    example: 3,
  })
  totalItems!: number;

  @ApiProperty({
    example: 5,
  })
  totalQuantity!: number;

  @ApiProperty({
    example: 146000,
  })
  subtotal!: number;

  @ApiProperty({
    example: 0,
  })
  deliveryFee!: number;

  @ApiProperty({
    example: 146000,
  })
  totalPrice!: number;
}

export class CheckoutDraftResponseDoc {
  @ApiProperty({
    example: '2dfc580d-0fab-4dd0-9f0f-c802e6aa1d7e',
  })
  draftId!: string;

  @ApiProperty({
    example: 'WAITING_LOCATION',
  })
  status!: 'WAITING_LOCATION';

  @ApiProperty({
    example: '2026-04-09T12:15:00.000Z',
  })
  expiresAt!: string;

  @ApiProperty({
    type: () => CheckoutDraftCustomerDoc,
  })
  customer!: CheckoutDraftCustomerDoc;

  @ApiProperty({
    type: () => CheckoutDraftDeliveryDoc,
  })
  delivery!: CheckoutDraftDeliveryDoc;

  @ApiProperty({
    type: () => [CheckoutDraftItemDoc],
  })
  items!: CheckoutDraftItemDoc[];

  @ApiProperty({
    type: () => CheckoutDraftSummaryDoc,
  })
  summary!: CheckoutDraftSummaryDoc;

  @ApiProperty({
    example: true,
  })
  locationRequestSent!: boolean;
}

export class CheckoutDraftEnvelopeDoc {
  @ApiProperty({
    type: () => CheckoutDraftResponseDoc,
    nullable: true,
  })
  draft!: CheckoutDraftResponseDoc | null;
}

export class OrderCustomerDoc extends CheckoutDraftCustomerDoc {}

export class OrderDeliveryDoc extends CheckoutDraftDeliveryDoc {}

export class OrderLocationDoc {
  @ApiProperty({
    enum: OrderLocationSource,
    example: OrderLocationSource.BOT_LOCATION,
  })
  source!: OrderLocationSource;

  @ApiProperty({
    example: 41.311081,
  })
  latitude!: number;

  @ApiProperty({
    example: 69.240562,
  })
  longitude!: number;

  @ApiProperty({
    example: '2026-04-09T11:59:00.000Z',
  })
  receivedAt!: string;
}

export class OrderItemProductSnapshotDoc {
  @ApiProperty({
    example: 'https://cdn.fullfood.uz/products/cheeseburger.png',
  })
  image!: string;

  @ApiProperty({
    example: 'Cheeseburger',
  })
  name!: string;

  @ApiProperty({
    example: "Mol go'shti, cheddar pishloq va maxsus sous bilan.",
  })
  description!: string;

  @ApiProperty({
    example: 'cmnzd2aqf0001p6f0s2lm8abc',
    nullable: true,
  })
  categoryId!: string | null;

  @ApiProperty({
    example: 'https://cdn.fullfood.uz/categories/burger.png',
  })
  categoryImage!: string;

  @ApiProperty({
    example: 'Burgerlar',
  })
  categoryName!: string;
}

export class OrderItemResponseDoc {
  @ApiProperty({
    example: 'cmob1item0001p6abcxyz789',
  })
  id!: string;

  @ApiProperty({
    example: 'cmnzd8xwd0002p6f0n8yz1abc',
    nullable: true,
  })
  productId!: string | null;

  @ApiProperty({
    example: 2,
  })
  quantity!: number;

  @ApiProperty({
    example: 32000,
  })
  unitPrice!: number;

  @ApiProperty({
    example: 64000,
  })
  lineTotal!: number;

  @ApiProperty({
    type: () => OrderItemProductSnapshotDoc,
  })
  product!: OrderItemProductSnapshotDoc;
}

export class OrderSummaryDoc extends CheckoutDraftSummaryDoc {}

export class OrderResponseDoc {
  @ApiProperty({
    example: 'cmob1234k0001p6abcxyz789',
  })
  id!: string;

  @ApiProperty({
    example: 'FF-20260409-654321',
  })
  orderNumber!: string;

  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.NEW,
  })
  status!: OrderStatus;

  @ApiProperty({
    enum: PaymentStatus,
    example: PaymentStatus.PENDING,
  })
  paymentStatus!: PaymentStatus;

  @ApiProperty({
    type: () => OrderCustomerDoc,
  })
  customer!: OrderCustomerDoc;

  @ApiProperty({
    type: () => OrderDeliveryDoc,
  })
  delivery!: OrderDeliveryDoc;

  @ApiProperty({
    type: () => OrderLocationDoc,
  })
  location!: OrderLocationDoc;

  @ApiProperty({
    type: () => [OrderItemResponseDoc],
  })
  items!: OrderItemResponseDoc[];

  @ApiProperty({
    type: () => OrderSummaryDoc,
  })
  summary!: OrderSummaryDoc;

  @ApiProperty({
    example: null,
    nullable: true,
  })
  cancelReason!: string | null;

  @ApiProperty({
    example: '2026-04-09T12:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-04-09T12:05:00.000Z',
  })
  updatedAt!: string;
}

export class OrderListResponseDoc {
  @ApiProperty({
    type: () => [OrderResponseDoc],
  })
  data!: OrderResponseDoc[];

  @ApiProperty({
    type: () => PaginationMetaDoc,
  })
  meta!: PaginationMetaDoc;
}
