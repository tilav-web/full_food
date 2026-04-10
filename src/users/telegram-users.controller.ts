import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentTelegramUser } from '../auth/decorators/current-telegram-user.decorator';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';
import { ApiTelegramInitDataAuth } from '../docs/swagger.decorators';
import { PublicUserResponseDoc } from '../docs/swagger.models';
import { PublicUser } from './users.service';

@Controller('users')
@ApiTags('Users')
export class TelegramUsersController {
  @Get('me')
  @UseGuards(TelegramAuthGuard)
  @ApiTelegramInitDataAuth()
  @ApiOperation({
    summary: 'Mini App user profili',
    description:
      'InitData orqali userni tekshiradi va faqat botdan ro`yxatdan o`tgan bo`lsa profilni qaytaradi.',
  })
  @ApiOkResponse({
    type: PublicUserResponseDoc,
  })
  @ApiUnauthorizedResponse({
    description: 'Telegram initData yuborilmagan yoki noto`g`ri.',
  })
  @ApiNotFoundResponse({
    description: 'Foydalanuvchi bot orqali ro`yxatdan o`tmagan.',
  })
  getProfile(@CurrentTelegramUser() user: PublicUser | null) {
    if (!user) {
      throw new NotFoundException(
        "Foydalanuvchi bot orqali ro'yxatdan o'tmagan.",
      );
    }

    return user;
  }
}
