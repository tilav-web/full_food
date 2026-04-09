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
import {
  CategoryResponseDoc,
  MessageResponseDoc,
} from '../docs/swagger.models';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
@ApiTags('Categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @UseGuards(HybridAuthGuard)
  @ApiTelegramInitDataAuth()
  @ApiWebBearerAuth()
  @ApiOperation({
    summary: "Category ro'yxatini olish",
    description:
      'Categorylarni qidiruv bilan olish endpointi. Mini App user `x-telegram-init-data`, web admin esa `Bearer` token bilan kira oladi.',
  })
  @ApiOkResponse({
    type: CategoryResponseDoc,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: "Kerakli auth yuborilmagan yoki noto'g'ri.",
  })
  findAll(@Query() query: ListCategoriesQueryDto) {
    return this.categoriesService.findAll(query);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiWebBearerAuth()
  @ApiOperation({
    summary: 'Category yaratish',
    description: 'Faqat `SUPER_ADMIN` foydalanuvchi category yarata oladi.',
  })
  @ApiCreatedResponse({
    type: CategoryResponseDoc,
  })
  @ApiForbiddenResponse({
    description: 'Faqat SUPER_ADMIN uchun.',
  })
  @ApiConflictResponse({
    description: 'Bunday nomdagi category allaqachon mavjud.',
  })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiWebBearerAuth()
  @ApiOperation({
    summary: 'Category ni yangilash',
  })
  @ApiParam({
    name: 'id',
    example: 'cmnzd2aqf0001p6f0s2lm8abc',
  })
  @ApiOkResponse({
    type: CategoryResponseDoc,
  })
  @ApiForbiddenResponse({
    description: 'Faqat SUPER_ADMIN uchun.',
  })
  @ApiConflictResponse({
    description: 'Bunday nomdagi category allaqachon mavjud.',
  })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiWebBearerAuth()
  @ApiOperation({
    summary: "Category ni o'chirish",
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
    description: "Category'ga product bog'langan bo'lsa o'chirib bo'lmaydi.",
  })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
