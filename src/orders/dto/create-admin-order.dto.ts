import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateAdminOrderItemDto {
  @ApiProperty({
    example: 'cmnzd8xwd0002p6f0n8yz1abc',
  })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({
    example: 2,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateAdminOrderDto {
  @ApiPropertyOptional({ example: 'cmnr0w2hq0000p60d15udg25w' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerUserId?: string;

  @ApiPropertyOptional({ example: '777422302' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerPhone?: string;

  @ApiPropertyOptional({ example: 'Ali' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerFirstName?: string;

  @ApiPropertyOptional({ example: 'Valiyev' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerLastName?: string;

  @ApiPropertyOptional({ example: 'Restoran ichida' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine?: string;

  @ApiPropertyOptional({ example: '2-podyezd' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entrance?: string;

  @ApiPropertyOptional({ example: '4-qavat' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  floor?: string;

  @ApiPropertyOptional({ example: '27-xonadon' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  apartment?: string;

  @ApiPropertyOptional({ example: 'Izoh' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ example: 41.311081 })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 69.240562 })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ enum: PaymentStatus, example: PaymentStatus.PAID })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiProperty({ type: () => [CreateAdminOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAdminOrderItemDto)
  items!: CreateAdminOrderItemDto[];
}
