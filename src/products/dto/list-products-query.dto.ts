import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { transformOptionalBoolean } from './transform-optional-boolean.util';

export class ListProductsQueryDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    example: 'burger',
    description: 'Product nomi yoki tarifidan qidiradi.',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: 'cmnzd2aqf0001p6f0s2lm8abc',
  })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Faqat active yoki inactive productlarni filterlash.',
  })
  @Transform(({ value }) => transformOptionalBoolean(value))
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
