import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdatePaymentStatusDto {
  @ApiProperty({
    enum: PaymentStatus,
    example: PaymentStatus.PAID,
    description:
      '`CANCELLED` statusi qo`lda berilmaydi. U order bekor qilinganda avtomatik o`rnatiladi.',
  })
  @IsEnum(PaymentStatus)
  paymentStatus!: PaymentStatus;
}
