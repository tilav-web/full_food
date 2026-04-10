import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { transformOptionalBoolean } from '../../products/dto/transform-optional-boolean.util';

export class ListUsersQueryDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'ali',
    description:
      'Telefon, ism, familiya, username yoki Telegram ID bo`yicha qidiruv.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    enum: Role,
    example: Role.CASHIER,
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({
    example: true,
    description: 'Telegram botda aktiv userlarni filter qiladi.',
  })
  @IsOptional()
  @Transform(({ value }) => transformOptionalBoolean(value))
  @IsBoolean()
  isBotActive?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Telegram ID bog`langan userlarni filter qiladi.',
  })
  @IsOptional()
  @Transform(({ value }) => transformOptionalBoolean(value))
  @IsBoolean()
  hasTelegramId?: boolean;
}
