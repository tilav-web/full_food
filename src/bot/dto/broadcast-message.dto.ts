import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class BroadcastMessageDto {
  @ApiProperty({
    example: 'Bugun kafe 23:00 gacha ishlaydi.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional({
    enum: Role,
    example: Role.USER,
    description:
      'Agar yuborilsa, xabar faqat shu rolga tegishli active userlarga ketadi.',
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
