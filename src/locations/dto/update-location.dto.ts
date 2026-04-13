import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateLocationDto {
  @ApiPropertyOptional({
    example: 'Ish joyim',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional({
    example: 41.311081,
  })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({
    example: 69.240562,
  })
  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
