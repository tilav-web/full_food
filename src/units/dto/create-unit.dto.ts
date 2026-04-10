import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUnitDto {
  @ApiProperty({
    example: 'Dona',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'dona',
    description: 'Qisqa belgi (masalan: dona, kg, l, ml).',
  })
  @IsString()
  @IsNotEmpty()
  symbol!: string;
}
