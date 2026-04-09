import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.ACCEPTED,
  })
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @ApiPropertyOptional({
    example: 'Mijoz so`rovi bilan bekor qilindi.',
    description: 'Faqat order `CANCELLED` holatiga o`tganda yuboriladi.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelReason?: string;
}
