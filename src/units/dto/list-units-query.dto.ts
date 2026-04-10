import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListUnitsQueryDto {
  @ApiPropertyOptional({
    example: 'dona',
    description: 'Unit nomi yoki belgi bo`yicha qidiruv.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  search?: string;
}
