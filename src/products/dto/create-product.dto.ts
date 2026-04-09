import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { transformOptionalBoolean } from './transform-optional-boolean.util';

export class CreateProductDto {
  @ApiProperty({
    example: 'https://cdn.fullfood.uz/products/cheeseburger.png',
  })
  @IsString()
  @IsNotEmpty()
  image!: string;

  @ApiProperty({
    example: 'Cheeseburger',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: "Mol go'shti, cheddar pishloq va maxsus sous bilan.",
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    example: 32000,
    description: "Product narxi. 2 xonagacha decimal bo'lishi mumkin.",
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
  price!: number;

  @ApiPropertyOptional({
    example: true,
    default: true,
  })
  @Transform(({ value }) => transformOptionalBoolean(value))
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    example: 'cmnzd2aqf0001p6f0s2lm8abc',
  })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;
}
