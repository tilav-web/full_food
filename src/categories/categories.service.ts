import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

type CategoryResponse = {
  id: string;
  image: string;
  name: string;
};

type CategoryWithProductsResponse = {
  id: string;
  image: string;
  name: string;
  products: Array<{
    id: string;
    image: string;
    name: string;
    description: string;
    price: number;
    stockQuantity: number;
    isActive: boolean;
    unitId: string;
    unit: {
      id: string;
      name: string;
      symbol: string;
    };
  }>;
};

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto): Promise<CategoryResponse> {
    try {
      const category = await this.prisma.category.create({
        data: {
          image: dto.image.trim(),
          name: dto.name.trim(),
        },
      });

      return this.toResponse(category);
    } catch (error) {
      this.handleCategoryWriteError(error);
    }
  }

  async findAll(query: ListCategoriesQueryDto): Promise<CategoryResponse[]> {
    const search = query.search?.trim();

    const categories = await this.prisma.category.findMany({
      where: search
        ? {
            name: {
              contains: search,
            },
          }
        : undefined,
      orderBy: {
        name: 'asc',
      },
    });

    return categories.map((category) => this.toResponse(category));
  }

  async findAllWithProducts(
    query: ListCategoriesQueryDto,
  ): Promise<CategoryWithProductsResponse[]> {
    const search = query.search?.trim();

    const categories = await this.prisma.category.findMany({
      where: search
        ? {
            name: {
              contains: search,
            },
          }
        : undefined,
      include: {
        products: {
          where: {
            isActive: true,
            stockQuantity: {
              gt: 0,
            },
          },
          include: {
            unit: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return categories.map((category) => ({
      id: category.id,
      image: category.image,
      name: category.name,
      products: category.products.map((product) => ({
        id: product.id,
        image: product.image,
        name: product.name,
        description: product.description,
        price: Number(product.price),
        stockQuantity: product.stockQuantity,
        isActive: product.isActive,
        unitId: product.unitId,
        unit: {
          id: product.unit.id,
          name: product.unit.name,
          symbol: product.unit.symbol,
        },
      })),
    }));
  }

  async findById(id: string): Promise<CategoryResponse> {
    const category = await this.findOneOrThrow(id);
    return this.toResponse(category);
  }

  async findOneOrThrow(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category topilmadi.');
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponse> {
    await this.findOneOrThrow(id);

    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: {
          image: dto.image?.trim(),
          name: dto.name?.trim(),
        },
      });

      return this.toResponse(category);
    } catch (error) {
      this.handleCategoryWriteError(error);
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOneOrThrow(id);

    const productsCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productsCount > 0) {
      throw new ConflictException(
        "Bu category'ga product bog'langan. Avval productlarni o'chiring.",
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return {
      message: "Category muvaffaqiyatli o'chirildi.",
    };
  }

  private toResponse(category: Category): CategoryResponse {
    return {
      id: category.id,
      image: category.image,
      name: category.name,
    };
  }

  private handleCategoryWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Bunday nomdagi category allaqachon mavjud.');
    }

    throw error;
  }
}
