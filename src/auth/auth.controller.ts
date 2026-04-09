import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { VerifyTelegramInitDataResponseDoc } from '../docs/swagger.models';
import { VerifyInitDataDto } from './dto/verify-init-data.dto';
import { AuthService } from './auth.service';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('telegram/init-data')
  @ApiOperation({
    summary: 'Telegram Mini App initData ni verify qilish',
    description:
      "Frontend Telegram Mini App dan olingan raw `initData` ni yuboradi. Javobda foydalanuvchi ro'yxatdan o'tganmi va uning roli qaytariladi.",
  })
  @ApiOkResponse({
    type: VerifyTelegramInitDataResponseDoc,
  })
  @ApiUnauthorizedResponse({
    description: "initData noto'g'ri, eskirgan yoki imzosi mos emas.",
  })
  verifyTelegramInitData(@Body() body: VerifyInitDataDto) {
    return this.authService.verifyTelegramInitData(body.initData);
  }
}
