import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class SetProductStockDto {
  @ApiProperty({
    example: 50,
    description:
      "Ombordagi aniq miqdorni to'g'irlash. Farq avtomatik batch sifatida yoziladi (musbat yoki manfiy).",
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockQuantity!: number;

  @ApiPropertyOptional({
    example: '2026-04-10T09:00:00.000Z',
    description: "Tuzatish vaqti. Yuborilmasa hozirgi vaqt olinadi.",
  })
  @IsOptional()
  @IsDateString()
  receivedAt?: string;
}
