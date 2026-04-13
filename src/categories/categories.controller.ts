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
  @ApiOperation({
    summary: "Category ro'yxatini olish",
    description: 'Categorylarni qidiruv bilan olish endpointi.',
  })
  @ApiOkResponse({
    type: CategoryResponseDoc,
    isArray: true,
  })
  findAll(@Query() query: ListCategoriesQueryDto) {
    return this.categoriesService.findAll(query);
  }

  @Get('menu')
  @ApiOperation({
    summary: 'Categorylarni productlari bilan olish',
    description:
      'Har bir category o`ziga tegishli active va omborda mavjud productlar bilan qaytadi. Mini App menu uchun.',
  })
  @ApiOkResponse({
    type: CategoryResponseDoc,
    isArray: true,
  })
  findAllWithProducts(@Query() query: ListCategoriesQueryDto) {
    return this.categoriesService.findAllWithProducts(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Category ni ID bo`yicha olish',
  })
  @ApiParam({
    name: 'id',
    example: 'cmnzd2aqf0001p6f0s2lm8abc',
  })
  @ApiOkResponse({
    type: CategoryResponseDoc,
  })
  findById(@Param('id') id: string) {
    return this.categoriesService.findById(id);
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
