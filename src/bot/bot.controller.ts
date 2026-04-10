import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiWebBearerAuth } from '../docs/swagger.decorators';
import { BroadcastResultResponseDoc } from '../docs/swagger.models';
import { BotService } from './bot.service';
import { BroadcastMessageDto } from './dto/broadcast-message.dto';

@Controller('bot')
@ApiTags('Bot')
@Roles(Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiWebBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Bearer access token yuborilmagan yoki noto`g`ri.',
})
@ApiForbiddenResponse({
  description: 'Faqat SUPER_ADMIN uchun.',
})
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post('broadcast')
  @ApiOperation({
    summary: 'Active Telegram userlarga xabar yuborish',
    description:
      'Faqat `isBotActive=true` bo`lgan userlarga broadcast qiladi. Yuborish vaqtida blocklangan userlar avtomatik inactive bo`lib belgilanadi.',
  })
  @ApiOkResponse({
    type: BroadcastResultResponseDoc,
  })
  broadcast(@Body() dto: BroadcastMessageDto) {
    return this.botService.broadcastMessage(dto);
  }
}
