import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class AddProductStockDto {
  @ApiProperty({
    example: 20,
    description: 'Omborga kelgan miqdor.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    example: '2026-04-10T09:00:00.000Z',
    description: 'Batch qabul qilingan vaqt. Yuborilmasa hozirgi vaqt olinadi.',
  })
  @IsOptional()
  @IsDateString()
  receivedAt?: string;
}
