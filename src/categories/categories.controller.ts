import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import {
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
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
import { UploadsService } from '../uploads/uploads.service';
import { CategoriesService } from './categories.service';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';

@Controller('categories')
@ApiTags('Categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly uploadsService: UploadsService,
  ) {}

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
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(
            new BadRequestException('Faqat rasm fayllari yuklash mumkin.'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: 'Category yaratish',
    description: 'Faqat `SUPER_ADMIN` foydalanuvchi category yarata oladi.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'image'],
      properties: {
        name: { type: 'string', example: 'Burgerlar' },
        image: { type: 'string', format: 'binary' },
      },
    },
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
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
  ) {
    if (!file) {
      throw new BadRequestException('Rasm yuborilmadi.');
    }

    if (!name?.trim()) {
      throw new BadRequestException('Nomi kiritilishi shart.');
    }

    const { url } = await this.uploadsService.saveImage(file);

    return this.categoriesService.create({ image: url, name });
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiWebBearerAuth()
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(
            new BadRequestException('Faqat rasm fayllari yuklash mumkin.'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: 'Category ni yangilash',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Lavashlar' },
        image: { type: 'string', format: 'binary' },
      },
    },
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
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('name') name?: string,
  ) {
    let image: string | undefined;

    if (file) {
      const result = await this.uploadsService.saveImage(file);
      image = result.url;
    }

    return this.categoriesService.update(id, {
      image,
      name: name?.trim() || undefined,
    });
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
