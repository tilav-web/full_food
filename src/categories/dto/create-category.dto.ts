import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'https://cdn.fullfood.uz/categories/burger.png',
    description: 'Category rasmi URL manzili.',
  })
  @IsString()
  @IsNotEmpty()
  image!: string;

  @ApiProperty({
    example: 'Burgerlar',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
