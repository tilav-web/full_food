import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { CurrentTelegramUser } from '../auth/decorators/current-telegram-user.decorator';
import { RegisteredUserGuard } from '../auth/guards/registered-user.guard';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';
import { ApiTelegramInitDataAuth } from '../docs/swagger.decorators';
import type { PublicUser } from '../users/users.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationsService } from './locations.service';

@Controller('locations')
@UseGuards(TelegramAuthGuard, RegisteredUserGuard)
@ApiTags('Locations')
@ApiTelegramInitDataAuth()
@ApiUnauthorizedResponse({
  description: 'Telegram initData yuborilmagan yoki noto`g`ri.',
})
@ApiForbiddenResponse({
  description: 'Foydalanuvchi ro`yxatdan o`tmagan.',
})
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Saqlangan joylashuvlar ro`yxati',
  })
  findAll(@CurrentTelegramUser() user: PublicUser) {
    return this.locationsService.findAllByUser(user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Yangi joylashuv saqlash',
  })
  create(
    @CurrentTelegramUser() user: PublicUser,
    @Body() dto: CreateLocationDto,
  ) {
    return this.locationsService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Joylashuvni yangilash',
  })
  @ApiParam({ name: 'id' })
  update(
    @CurrentTelegramUser() user: PublicUser,
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Joylashuvni o`chirish',
  })
  @ApiParam({ name: 'id' })
  remove(
    @CurrentTelegramUser() user: PublicUser,
    @Param('id') id: string,
  ) {
    return this.locationsService.remove(user.id, id);
  }
}
