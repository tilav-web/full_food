import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiPropertyOptional({
    example: 'https://cdn.fullfood.uz/categories/burger.png',
    description: 'Category rasmi URL manzili (ixtiyoriy).',
  })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiProperty({
    example: 'Burgerlar',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
