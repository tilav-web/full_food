import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginWithPasswordDto {
  @ApiProperty({
    example: '777422302',
    description: 'Telefon raqam `+998` siz, 9 xonali formatda yuboriladi.',
  })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({
    example: '777422302',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
