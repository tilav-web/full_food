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
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiWebBearerAuth } from '../docs/swagger.decorators';
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
  @ApiOperation({
    summary: 'Unitlar ro`yxati',
    description: 'Unitlarni qidiruv bilan olish endpointi.',
  })
  @ApiOkResponse({
    type: UnitResponseDoc,
    isArray: true,
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
