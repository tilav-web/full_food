import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiWebBearerAuth } from '../docs/swagger.decorators';
import {
  PublicUserResponseDoc,
  UserListResponseDoc,
} from '../docs/swagger.models';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UsersService } from './users.service';

@Controller('users')
@ApiTags('Users')
@Roles(Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiWebBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Bearer access token yuborilmagan yoki noto`g`ri.',
})
@ApiForbiddenResponse({
  description: 'Faqat SUPER_ADMIN uchun.',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'Userlar ro`yxati',
    description:
      'Super admin Telegram botdan ro`yxatdan o`tgan yoki web userlarni search, role va activity filter bilan ko`ra oladi.',
  })
  @ApiOkResponse({
    type: UserListResponseDoc,
  })
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.usersService.listUsers(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Bitta userni olish',
  })
  @ApiParam({
    name: 'id',
    example: 'cmnr0w2hq0000p60d15udg25w',
  })
  @ApiOkResponse({
    type: PublicUserResponseDoc,
  })
  findUser(@Param('id') id: string) {
    return this.usersService.findPublicByIdOrThrow(id);
  }

  @Patch(':id/role')
  @ApiOperation({
    summary: 'User rolini o`zgartirish',
    description:
      'Super admin bot userni `USER`, `CASHIER` yoki `SUPER_ADMIN` roliga o`tkazadi.',
  })
  @ApiParam({
    name: 'id',
    example: 'cmnr0w2hq0000p60d15udg25w',
  })
  @ApiOkResponse({
    type: PublicUserResponseDoc,
  })
  @ApiBadRequestResponse({
    description: 'Oxirgi SUPER_ADMIN roli o`zgartirilayotgan bo`lishi mumkin.',
  })
  updateUserRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.usersService.updateUserRole(id, dto);
  }

  @Patch(':id/password')
  @ApiOperation({
    summary: 'User parolini o`rnatish yoki yangilash',
    description:
      'Super admin kassir yoki admin panel userlari uchun web login parolini o`rnatadi.',
  })
  @ApiParam({
    name: 'id',
    example: 'cmnr0w2hq0000p60d15udg25w',
  })
  @ApiOkResponse({
    type: PublicUserResponseDoc,
  })
  updateUserPassword(
    @Param('id') id: string,
    @Body() dto: UpdateUserPasswordDto,
  ) {
    return this.usersService.updateUserPassword(id, dto);
  }
}
