import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { HybridAuthGuard } from '../auth/guards/hybrid-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  ApiTelegramInitDataAuth,
  ApiWebBearerAuth,
} from '../docs/swagger.decorators';
import { MessageResponseDoc, UnitResponseDoc } from '../docs/swagger.models';
import { CreateUnitDto } from './dto/create-unit.dto';
import { ListUnitsQueryDto } from './dto/list-units-query.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitsService } from './units.service';

@Controller('units')
@ApiTags('Units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @UseGuards(HybridAuthGuard)
  @ApiTelegramInitDataAuth()
  @ApiWebBearerAuth()
  @ApiOperation({
    summary: 'Unitlar ro`yxati',
    description:
      'Unitlarni qidiruv bilan olish endpointi. Mini App user `x-telegram-init-data`, web admin esa `Bearer` token bilan kira oladi.',
  })
  @ApiOkResponse({
    type: UnitResponseDoc,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: "Kerakli auth yuborilmagan yoki noto'g'ri.",
  })
  findAll(@Query() query: ListUnitsQueryDto) {
    return this.unitsService.findAll(query);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiWebBearerAuth()
  @ApiOperation({
    summary: 'Unit yaratish',
    description: 'Faqat `SUPER_ADMIN` unit yarata oladi.',
  })
  @ApiCreatedResponse({
    type: UnitResponseDoc,
  })
  @ApiForbiddenResponse({
    description: 'Faqat SUPER_ADMIN uchun.',
  })
  @ApiConflictResponse({
    description: 'Bunday unit allaqachon mavjud.',
  })
  create(@Body() dto: CreateUnitDto) {
    return this.unitsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiWebBearerAuth()
  @ApiOperation({
    summary: 'Unit ni yangilash',
  })
  @ApiParam({
    name: 'id',
    example: 'cmnzd2aqf0001p6f0s2lm8abc',
  })
  @ApiOkResponse({
    type: UnitResponseDoc,
  })
  @ApiForbiddenResponse({
    description: 'Faqat SUPER_ADMIN uchun.',
  })
  @ApiConflictResponse({
    description: 'Bunday unit allaqachon mavjud.',
  })
  update(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.unitsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiWebBearerAuth()
  @ApiOperation({
    summary: "Unit ni o'chirish",
  })
  @ApiParam({
    name: 'id',
    example: 'cmnzd2aqf0001p6f0s2lm8abc',
  })
  @ApiOkResponse({
    type: MessageResponseDoc,
  })
  @ApiForbiddenResponse({
    description: 'Faqat SUPER_ADMIN uchun.',
  })
  @ApiConflictResponse({
    description: "Unit'ga product bog'langan bo'lsa o'chirib bo'lmaydi.",
  })
  remove(@Param('id') id: string) {
    return this.unitsService.remove(id);
  }
}
