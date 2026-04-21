import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
  MessageResponseDoc,
  ProductListResponseDoc,
  ProductResponseDoc,
} from '../docs/swagger.models';
import { CurrentAuthUser } from '../auth/decorators/current-auth-user.decorator';
import type { PublicUser } from '../users/users.service';
import { UploadsService } from '../uploads/uploads.service';
import { AddProductStockDto } from './dto/add-product-stock.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { SetProductStockDto } from './dto/set-product-stock.dto';
import { ProductsService } from './products.service';

@Controller('products')
@ApiTags('Products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Productlar ro'yxati",
    description:
      'Search, category filter, active filter va pagination bilan productlarni qaytaradi.',
  })
  @ApiOkResponse({
    type: ProductListResponseDoc,
  })
  findAll(@Query() query: ListProductsQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Bitta productni olish',
  })
  @ApiParam({
    name: 'id',
    example: 'cmnzd8xwd0002p6f0n8yz1abc',
  })
  @ApiOkResponse({
    type: ProductResponseDoc,
  })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
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
    summary: 'Product yaratish',
    description: 'Faqat `SUPER_ADMIN` product yarata oladi.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'description', 'price', 'categoryId', 'unitId'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        image: { type: 'string', format: 'binary' },
        categoryId: { type: 'string' },
        unitId: { type: 'string' },
        isActive: { type: 'boolean' },
      },
    },
  })
  @ApiCreatedResponse({
    type: ProductResponseDoc,
  })
  @ApiForbiddenResponse({
    description: 'Faqat SUPER_ADMIN uchun.',
  })
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { name: string; description: string; price: string; categoryId: string; unitId: string; isActive?: string },
  ) {
    let image: string | undefined;

    if (file) {
      const { url } = await this.uploadsService.saveImage(file);
      image = url;
    }

    return this.productsService.create({
      image,
      name: body.name,
      description: body.description,
      price: Number(body.price),
      categoryId: body.categoryId,
      unitId: body.unitId,
      isActive: body.isActive === 'true' ? true : undefined,
    });
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
    summary: 'Product ni yangilash',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        image: { type: 'string', format: 'binary' },
        categoryId: { type: 'string' },
        unitId: { type: 'string' },
        isActive: { type: 'boolean' },
      },
    },
  })
  @ApiParam({
    name: 'id',
    example: 'cmnzd8xwd0002p6f0n8yz1abc',
  })
  @ApiOkResponse({
    type: ProductResponseDoc,
  })
  @ApiForbiddenResponse({
    description: 'Faqat SUPER_ADMIN uchun.',
  })
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { name?: string; description?: string; price?: string; categoryId?: string; unitId?: string; isActive?: string },
  ) {
    let image: string | undefined;

    if (file) {
      const result = await this.uploadsService.saveImage(file);
      image = result.url;
    }

    return this.productsService.update(id, {
      image,
      name: body.name,
      description: body.description,
      price: body.price !== undefined ? Number(body.price) : undefined,
      categoryId: body.categoryId,
      unitId: body.unitId,
      isActive: body.isActive !== undefined ? body.isActive === 'true' : undefined,
    });
  }

  @Get('batches/list')
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiWebBearerAuth()
  @ApiOperation({
    summary: 'Kirimlar tarixini olish',
    description: 'Barcha batch lar ro`yxati, productId bo`yicha filter qilish mumkin.',
  })
  listBatches(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('productId') productId?: string,
  ) {
    return this.productsService.listBatches({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      productId: productId || undefined,
    });
  }

  @Post(':id/stock')
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiWebBearerAuth()
  @HttpCode(200)
  @ApiOperation({
    summary: "Product omboriga yangi batch qo'shish",
    description:
      "Admin product omboriga kelgan batchni qo'shadi. Stock ko'payadi va product avtomatik active bo'ladi.",
  })
  @ApiParam({
    name: 'id',
    example: 'cmnzd8xwd0002p6f0n8yz1abc',
  })
  @ApiOkResponse({
    type: ProductResponseDoc,
  })
  @ApiForbiddenResponse({
    description: 'Faqat SUPER_ADMIN uchun.',
  })
  addStock(
    @Param('id') id: string,
    @Body() dto: AddProductStockDto,
    @CurrentAuthUser() staffUser: PublicUser,
  ) {
    return this.productsService.addStock(id, dto, staffUser);
  }

  @Patch(':id/stock')
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiWebBearerAuth()
  @HttpCode(200)
  @ApiOperation({
    summary: "Product ombor miqdorini to'g'irlash",
    description:
      "Admin xato qo'shgan bo'lsa, aniq stock miqdorini o'rnatadi. Farq batch sifatida yoziladi.",
  })
  @ApiParam({
    name: 'id',
    example: 'cmnzd8xwd0002p6f0n8yz1abc',
  })
  @ApiOkResponse({
    type: ProductResponseDoc,
  })
  @ApiForbiddenResponse({
    description: 'Faqat SUPER_ADMIN uchun.',
  })
  setStock(
    @Param('id') id: string,
    @Body() dto: SetProductStockDto,
    @CurrentAuthUser() staffUser: PublicUser,
  ) {
    return this.productsService.setStock(id, dto, staffUser);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiWebBearerAuth()
  @ApiOperation({
    summary: "Product ni o'chirish",
  })
  @ApiParam({
    name: 'id',
    example: 'cmnzd8xwd0002p6f0n8yz1abc',
  })
  @ApiOkResponse({
    type: MessageResponseDoc,
  })
  @ApiForbiddenResponse({
    description: 'Faqat SUPER_ADMIN uchun.',
  })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
