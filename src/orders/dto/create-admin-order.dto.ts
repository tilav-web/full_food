import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateCheckoutDto } from './create-checkout.dto';

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

export class CreateAdminOrderDto extends CreateCheckoutDto {
  @ApiPropertyOptional({
    example: 'cmnr0w2hq0000p60d15udg25w',
    description:
      'Agar buyurtma tizimdagi ro`yxatdan o`tgan mijozga tegishli bo`lsa, uning user ID si yuboriladi.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerUserId?: string;

  @ApiProperty({
    example: '777422302',
    description: 'Mijoz telefoni 9 xonali formatda yuboriladi.',
  })
  @IsString()
  @IsNotEmpty()
  customerPhone!: string;

  @ApiProperty({
    example: 'Ali',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  customerFirstName!: string;

  @ApiProperty({
    example: 'Valiyev',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  customerLastName!: string;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    example: PaymentStatus.PAID,
    description:
      '`PENDING` yoki `PAID` yuboriladi. `CANCELLED` create vaqtida qabul qilinmaydi.',
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiProperty({
    type: () => [CreateAdminOrderItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAdminOrderItemDto)
  items!: CreateAdminOrderItemDto[];
}
