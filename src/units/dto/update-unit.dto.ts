import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateUnitDto {
  @ApiPropertyOptional({
    example: 'Dona',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'dona',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  symbol?: string;
}
