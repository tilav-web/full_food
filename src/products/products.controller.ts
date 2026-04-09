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
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';
import { ApiTelegramInitDataAuth } from '../docs/swagger.decorators';
import {
  MessageResponseDoc,
  ProductListResponseDoc,
  ProductResponseDoc,
} from '../docs/swagger.models';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(TelegramAuthGuard)
@ApiTags('Products')
@ApiTelegramInitDataAuth()
@ApiUnauthorizedResponse({
  description: "Telegram initData header yuborilmagan yoki noto'g'ri.",
})
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

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
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Product yaratish',
    description: 'Faqat `SUPER_ADMIN` product yarata oladi.',
  })
  @ApiCreatedResponse({
    type: ProductResponseDoc,
  })
  @ApiForbiddenResponse({
    description: 'Faqat SUPER_ADMIN uchun.',
  })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Product ni yangilash',
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
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
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
