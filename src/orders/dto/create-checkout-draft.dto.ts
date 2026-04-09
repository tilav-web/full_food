import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCheckoutDraftDto {
  @ApiProperty({
    example: 'Toshkent shahar, Chilonzor 5-daha, 12-uy',
    description: 'Buyurtma yetkazib beriladigan asosiy manzil.',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  addressLine!: string;

  @ApiPropertyOptional({
    example: '2-podyezd',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entrance?: string;

  @ApiPropertyOptional({
    example: '4-qavat',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  floor?: string;

  @ApiPropertyOptional({
    example: '27-xonadon',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  apartment?: string;

  @ApiPropertyOptional({
    example: 'Domofonni bosing, qo`ng`iroq ishlamaydi.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
