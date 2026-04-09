import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    example: 'https://cdn.fullfood.uz/categories/lavash.png',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({
    example: 'Lavashlar',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;
}
