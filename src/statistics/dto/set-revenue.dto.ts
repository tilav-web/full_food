import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class SetRevenueDto {
  @ApiProperty({ example: 150000, description: "Yangi daromad qiymati (so'mda)." })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value!: number;
}
