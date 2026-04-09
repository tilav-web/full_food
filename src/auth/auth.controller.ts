import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  MessageResponseDoc,
  PasswordLoginResponseDoc,
  VerifyTelegramInitDataResponseDoc,
} from '../docs/swagger.models';
import { ApiRefreshCookieAuth } from '../docs/swagger.decorators';
import { LoginWithPasswordDto } from './dto/login-with-password.dto';
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

  @Post('web/login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Admin yoki kassir login',
    description:
      "Telefon raqam va parol orqali web/admin panel uchun login qiladi. Response body ichida access token qaytadi, refresh token esa httpOnly cookie'ga yoziladi.",
  })
  @ApiOkResponse({
    type: PasswordLoginResponseDoc,
  })
  @ApiUnauthorizedResponse({
    description:
      "Telefon yoki parol noto'g'ri, yoki foydalanuvchi web login uchun ruxsatli emas.",
  })
  loginWithPassword(
    @Body() dto: LoginWithPasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.loginWithPassword(dto, response);
  }

  @Post('web/refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Access token ni refresh qilish',
    description:
      'Refresh token cookie orqali yangi access token va yangi refresh cookie qaytaradi.',
  })
  @ApiRefreshCookieAuth()
  @ApiOkResponse({
    type: PasswordLoginResponseDoc,
  })
  @ApiUnauthorizedResponse({
    description: "Refresh token topilmadi, noto'g'ri yoki eskirgan.",
  })
  refreshWebSession(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.refreshWebSession(request.cookies, response);
  }

  @Post('web/logout')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Web session ni yopish',
    description: 'Refresh cookie ni tozalaydi va sessionni bekor qiladi.',
  })
  @ApiRefreshCookieAuth()
  @ApiOkResponse({
    type: MessageResponseDoc,
  })
  logoutWebSession(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.logoutWebSession(request.cookies, response);
  }
}
