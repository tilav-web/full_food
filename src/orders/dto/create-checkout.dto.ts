import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCheckoutDto {
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

  @ApiProperty({
    example: 41.311081,
    description: 'Mini App frontendi yuboradigan latitude qiymati.',
  })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({
    example: 69.240562,
    description: 'Mini App frontendi yuboradigan longitude qiymati.',
  })
  @IsLongitude()
  longitude!: number;
}
