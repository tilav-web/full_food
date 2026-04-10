import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { CategoriesService } from '../categories/categories.service';
import { PrismaService } from '../prisma/prisma.service';
import type { PublicUser } from '../users/users.service';
import { AddProductStockDto } from './dto/add-product-stock.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';

type ProductListItem = {
  id: string;
  image: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
  categoryId: string;
  unitId: string;
  category: {
    id: string;
    image: string;
    name: string;
  };
  unit: {
    id: string;
    name: string;
    symbol: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

type PaginatedProductsResponse = {
  data: ProductListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductListItem> {
    await this.categoriesService.findOneOrThrow(dto.categoryId);
    await this.ensureUnitExists(dto.unitId);

    if (dto.isActive) {
      throw new BadRequestException(
        "Stock bo'lmasa productni active qilib bo'lmaydi. Avval stock qo'shing.",
      );
    }

    const product = await this.prisma.product.create({
      data: {
        image: dto.image.trim(),
        name: dto.name.trim(),
        description: dto.description.trim(),
        price: new Prisma.Decimal(dto.price),
        isActive: dto.isActive ?? false,
        categoryId: dto.categoryId,
        unitId: dto.unitId,
      },
      include: {
        category: true,
        unit: true,
      },
    });

    return this.toResponse(product);
  }

  async findAll(
    query: ListProductsQueryDto,
  ): Promise<PaginatedProductsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();

    const where: Prisma.ProductWhereInput = {
      categoryId: query.categoryId?.trim() || undefined,
      isActive: query.isActive,
      OR: search
        ? [
            {
              name: {
                contains: search,
              },
            },
            {
              description: {
                contains: search,
              },
            },
          ]
        : undefined,
    };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          unit: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      data: products.map((product) => this.toResponse(product)),
      meta: {
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<ProductListItem> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        unit: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product topilmadi.');
    }

    return this.toResponse(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductListItem> {
    const existingProduct = await this.ensureProductExists(id);

    if (dto.categoryId) {
      await this.categoriesService.findOneOrThrow(dto.categoryId);
    }

    if (dto.unitId) {
      await this.ensureUnitExists(dto.unitId);
    }

    if (dto.isActive === true && existingProduct.stockQuantity <= 0) {
      throw new BadRequestException(
        "Stock bo'lmasa productni active qilib bo'lmaydi. Avval stock qo'shing.",
      );
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        image: dto.image?.trim(),
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        price:
          dto.price === undefined ? undefined : new Prisma.Decimal(dto.price),
        isActive: dto.isActive,
        categoryId: dto.categoryId,
        unitId: dto.unitId,
      },
      include: {
        category: true,
        unit: true,
      },
    });

    return this.toResponse(product);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.ensureProductExists(id);

    await this.prisma.product.delete({
      where: { id },
    });

    return {
      message: "Product muvaffaqiyatli o'chirildi.",
    };
  }

  async addStock(
    productId: string,
    dto: AddProductStockDto,
    staffUser: PublicUser,
  ): Promise<ProductListItem> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        unitId: true,
        stockQuantity: true,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product topilmadi.');
    }

    const receivedAt = dto.receivedAt ? new Date(dto.receivedAt) : new Date();

    if (Number.isNaN(receivedAt.getTime())) {
      throw new BadRequestException('receivedAt noto`g`ri formatda yuborildi.');
    }

    const updatedProduct = await this.prisma.$transaction(
      async (transaction) => {
        await transaction.inventoryBatch.create({
          data: {
            productId: product.id,
            quantity: dto.quantity,
            receivedAt,
            createdByStaffId: staffUser.id,
          },
        });

        return transaction.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: {
              increment: dto.quantity,
            },
            isActive: true,
          },
          include: {
            category: true,
            unit: true,
          },
        });
      },
    );

    return this.toResponse(updatedProduct);
  }

  private async ensureProductExists(
    id: string,
  ): Promise<{ id: string; stockQuantity: number }> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, stockQuantity: true },
    });

    if (!product) {
      throw new NotFoundException('Product topilmadi.');
    }

    return product;
  }

  private async ensureUnitExists(id: string): Promise<void> {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!unit) {
      throw new NotFoundException('Unit topilmadi.');
    }
  }

  private toResponse(
    product: Product & {
      category: {
        id: string;
        image: string;
        name: string;
      };
      unit: {
        id: string;
        name: string;
        symbol: string;
      };
    },
  ): ProductListItem {
    return {
      id: product.id,
      image: product.image,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      stockQuantity: product.stockQuantity,
      isActive: product.isActive,
      categoryId: product.categoryId,
      unitId: product.unitId,
      category: {
        id: product.category.id,
        image: product.category.image,
        name: product.category.name,
      },
      unit: {
        id: product.unit.id,
        name: product.unit.name,
        symbol: product.unit.symbol,
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
