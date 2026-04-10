import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Unit } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { ListUnitsQueryDto } from './dto/list-units-query.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

type UnitResponse = {
  id: string;
  name: string;
  symbol: string;
};

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUnitDto): Promise<UnitResponse> {
    try {
      const unit = await this.prisma.unit.create({
        data: {
          name: dto.name.trim(),
          symbol: dto.symbol.trim(),
        },
      });

      return this.toResponse(unit);
    } catch (error) {
      this.handleUnitWriteError(error);
    }
  }

  async findAll(query: ListUnitsQueryDto): Promise<UnitResponse[]> {
    const search = query.search?.trim();

    const units = await this.prisma.unit.findMany({
      where: search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                },
              },
              {
                symbol: {
                  contains: search,
                },
              },
            ],
          }
        : undefined,
      orderBy: {
        name: 'asc',
      },
    });

    return units.map((unit) => this.toResponse(unit));
  }

  async findOneOrThrow(id: string): Promise<Unit> {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
    });

    if (!unit) {
      throw new NotFoundException('Unit topilmadi.');
    }

    return unit;
  }

  async update(id: string, dto: UpdateUnitDto): Promise<UnitResponse> {
    await this.findOneOrThrow(id);

    try {
      const unit = await this.prisma.unit.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          symbol: dto.symbol?.trim(),
        },
      });

      return this.toResponse(unit);
    } catch (error) {
      this.handleUnitWriteError(error);
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOneOrThrow(id);

    const productsCount = await this.prisma.product.count({
      where: { unitId: id },
    });

    if (productsCount > 0) {
      throw new ConflictException(
        "Bu unit'ga product bog'langan. Avval productlarni o'zgartiring.",
      );
    }

    await this.prisma.unit.delete({
      where: { id },
    });

    return {
      message: "Unit muvaffaqiyatli o'chirildi.",
    };
  }

  private toResponse(unit: Unit): UnitResponse {
    return {
      id: unit.id,
      name: unit.name,
      symbol: unit.symbol,
    };
  }

  private handleUnitWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Bunday unit allaqachon mavjud.');
    }

    throw error;
  }
}
