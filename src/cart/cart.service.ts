import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PublicUser } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

type CartItemResponse = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: {
    id: string;
    image: string | null;
    name: string;
    description: string;
    price: number;
    stockQuantity: number;
    isActive: boolean;
    categoryId: string;
    unitId: string;
    category: {
      id: string;
      image: string | null;
      name: string;
    };
    unit: {
      id: string;
      name: string;
      symbol: string;
    };
  };
};

type CartResponse = {
  items: CartItemResponse[];
  summary: {
    totalItems: number;
    totalQuantity: number;
    totalPrice: number;
  };
};

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(user: PublicUser): Promise<CartResponse> {
    return this.buildCartResponse(user.id);
  }

  async addItem(user: PublicUser, dto: AddCartItemDto): Promise<CartResponse> {
    const quantityToAdd = dto.quantity ?? 1;
    const productId = dto.productId.trim();

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        isActive: true,
        stockQuantity: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product topilmadi.');
    }

    if (!product.isActive) {
      throw new BadRequestException(
        "Faqat active bo'lgan product savatga qo'shiladi.",
      );
    }

    if (product.stockQuantity <= 0) {
      throw new BadRequestException('Product omborda tugagan.');
    }

    const existingCartItem = await this.prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId,
        },
      },
      select: {
        quantity: true,
      },
    });

    const nextQuantity = (existingCartItem?.quantity ?? 0) + quantityToAdd;

    if (nextQuantity > product.stockQuantity) {
      throw new BadRequestException('Product omborda yetarli emas.');
    }

    await this.prisma.cartItem.upsert({
      where: {
        userId_productId: {
          userId: user.id,
          productId,
        },
      },
      update: {
        quantity: {
          increment: quantityToAdd,
        },
      },
      create: {
        userId: user.id,
        productId,
        quantity: quantityToAdd,
      },
    });

    return this.buildCartResponse(user.id);
  }

  async updateItemQuantity(
    user: PublicUser,
    productId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartResponse> {
    const trimmedProductId = productId.trim();

    const cartItem = await this.prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId: trimmedProductId,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            isActive: true,
            stockQuantity: true,
          },
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Savatdagi product topilmadi.');
    }

    if (!cartItem.product.isActive) {
      throw new BadRequestException(
        "Active bo'lmagan product quantity'sini o'zgartirib bo'lmaydi.",
      );
    }

    if (dto.quantity > cartItem.product.stockQuantity) {
      throw new BadRequestException('Product omborda yetarli emas.');
    }

    await this.prisma.cartItem.update({
      where: {
        userId_productId: {
          userId: user.id,
          productId: trimmedProductId,
        },
      },
      data: {
        quantity: dto.quantity,
      },
    });

    return this.buildCartResponse(user.id);
  }

  async removeItem(user: PublicUser, productId: string): Promise<CartResponse> {
    const trimmedProductId = productId.trim();

    const cartItem = await this.prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId: trimmedProductId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Savatdagi product topilmadi.');
    }

    await this.prisma.cartItem.delete({
      where: {
        userId_productId: {
          userId: user.id,
          productId: trimmedProductId,
        },
      },
    });

    return this.buildCartResponse(user.id);
  }

  private async buildCartResponse(userId: string): Promise<CartResponse> {
    const cartItems = await this.prisma.cartItem.findMany({
      where: {
        userId,
      },
      include: {
        product: {
          include: {
            category: true,
            unit: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    let totalQuantity = 0;
    let totalPrice = new Prisma.Decimal(0);

    const items = cartItems.map((cartItem) => {
      const unitPrice = new Prisma.Decimal(cartItem.product.price);
      const lineTotal = unitPrice.mul(cartItem.quantity);

      totalQuantity += cartItem.quantity;
      totalPrice = totalPrice.add(lineTotal);

      return {
        id: cartItem.id,
        productId: cartItem.productId,
        quantity: cartItem.quantity,
        unitPrice: Number(unitPrice),
        lineTotal: Number(lineTotal),
        product: {
          id: cartItem.product.id,
          image: cartItem.product.image,
          name: cartItem.product.name,
          description: cartItem.product.description,
          price: Number(cartItem.product.price),
          stockQuantity: cartItem.product.stockQuantity,
          isActive: cartItem.product.isActive,
          categoryId: cartItem.product.categoryId,
          unitId: cartItem.product.unitId,
          category: {
            id: cartItem.product.category.id,
            image: cartItem.product.category.image,
            name: cartItem.product.category.name,
          },
          unit: {
            id: cartItem.product.unit.id,
            name: cartItem.product.unit.name,
            symbol: cartItem.product.unit.symbol,
          },
        },
      };
    });

    return {
      items,
      summary: {
        totalItems: items.length,
        totalQuantity,
        totalPrice: Number(totalPrice),
      },
    };
  }
}
