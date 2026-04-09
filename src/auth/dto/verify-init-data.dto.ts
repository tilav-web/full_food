import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyInitDataDto {
  @ApiProperty({
    description: 'Telegram Mini App dan kelgan raw initData string.',
    example:
      'query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Ali%22%7D&auth_date=1710000000&hash=abcdef123456',
  })
  @IsString()
  @IsNotEmpty()
  initData!: string;
}
