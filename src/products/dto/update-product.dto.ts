import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { transformOptionalBoolean } from './transform-optional-boolean.util';

export class UpdateProductDto {
  @ApiPropertyOptional({
    example: 'https://cdn.fullfood.uz/products/double-burger.png',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({
    example: 'Double Burger',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'Ikki qavatli kotlet va pishloq bilan.',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 45000,
  })
  @Type(() => Number)
  @IsNumber(
    {
      maxDecimalPlaces: 2,
    },
    {
      message: "Narx raqam ko'rinishida yuborilishi kerak.",
    },
  )
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({
    example: false,
  })
  @Transform(({ value }) => transformOptionalBoolean(value))
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'cmnzd2aqf0001p6f0s2lm8abc',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    example: 'cmnzd2aqf0001p6f0s2lm8xyz',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  unitId?: string;
}
