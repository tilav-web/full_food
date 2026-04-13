import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentAuthUser } from '../auth/decorators/current-auth-user.decorator';
import { HybridAuthGuard } from '../auth/guards/hybrid-auth.guard';
import { ApiTelegramInitDataAuth } from '../docs/swagger.decorators';
import { PublicUserResponseDoc } from '../docs/swagger.models';
import { PublicUser } from './users.service';

@Controller('users')
@ApiTags('Users')
export class TelegramUsersController {
  @Get('me')
  @UseGuards(HybridAuthGuard)
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
  getProfile(@CurrentAuthUser() user: PublicUser | null) {
    if (!user) {
      throw new NotFoundException(
        "Foydalanuvchi bot orqali ro'yxatdan o'tmagan.",
      );
    }

    return user;
  }
}
