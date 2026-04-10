import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentAuthUser } from '../auth/decorators/current-auth-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiWebBearerAuth } from '../docs/swagger.decorators';
import { PublicUserResponseDoc } from '../docs/swagger.models';
import type { PublicUser } from './users.service';

@Controller('users')
@ApiTags('Users')
@Roles(Role.SUPER_ADMIN, Role.CASHIER)
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiWebBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Bearer access token yuborilmagan yoki noto`g`ri.',
})
export class WebUsersController {
  @Get('web/me')
  @ApiOperation({
    summary: 'Web admin/kassir profili',
    description: 'JWT orqali login bo`lgan admin yoki kassir profili.',
  })
  @ApiOkResponse({
    type: PublicUserResponseDoc,
  })
  getProfile(@CurrentAuthUser() user: PublicUser) {
    return user;
  }
}
