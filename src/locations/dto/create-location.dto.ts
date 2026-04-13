import { ApiProperty } from '@nestjs/swagger';
import {
  IsLatitude,
  IsLongitude,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateLocationDto {
  @ApiProperty({
    example: 'Uyim',
    description: 'Joylashuv nomi (masalan: Uyim, Ish joyim).',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label!: string;

  @ApiProperty({
    example: 41.311081,
  })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({
    example: 69.240562,
  })
  @IsLongitude()
  longitude!: number;
}
