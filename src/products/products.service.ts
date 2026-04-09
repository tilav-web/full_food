import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { CategoriesService } from '../categories/categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';

type ProductListItem = {
  id: string;
  image: string;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  categoryId: string;
  category: {
    id: string;
    image: string;
    name: string;
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

    const product = await this.prisma.product.create({
      data: {
        image: dto.image.trim(),
        name: dto.name.trim(),
        description: dto.description.trim(),
        price: new Prisma.Decimal(dto.price),
        isActive: dto.isActive ?? true,
        categoryId: dto.categoryId,
      },
      include: {
        category: true,
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
      },
    });

    if (!product) {
      throw new NotFoundException('Product topilmadi.');
    }

    return this.toResponse(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductListItem> {
    await this.ensureProductExists(id);

    if (dto.categoryId) {
      await this.categoriesService.findOneOrThrow(dto.categoryId);
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
      },
      include: {
        category: true,
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

  private async ensureProductExists(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product topilmadi.');
    }
  }

  private toResponse(
    product: Product & {
      category: {
        id: string;
        image: string;
        name: string;
      };
    },
  ): ProductListItem {
    return {
      id: product.id,
      image: product.image,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      isActive: product.isActive,
      categoryId: product.categoryId,
      category: {
        id: product.category.id,
        image: product.category.image,
        name: product.category.name,
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
