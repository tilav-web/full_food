import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListCategoriesQueryDto {
  @ApiPropertyOptional({
    example: 'burger',
    description: "Category nomi bo'yicha qidiruv.",
  })
  @IsString()
  @IsOptional()
  search?: string;
}
