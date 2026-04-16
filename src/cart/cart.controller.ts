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
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { CurrentAuthUser } from '../auth/decorators/current-auth-user.decorator';
import { RegisteredUserGuard } from '../auth/guards/registered-user.guard';
import { HybridAuthGuard } from '../auth/guards/hybrid-auth.guard';
import { ApiTelegramInitDataAuth } from '../docs/swagger.decorators';
import { CartResponseDoc } from '../docs/swagger.models';
import type { PublicUser } from '../users/users.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartService } from './cart.service';

@Controller('cart')
@UseGuards(HybridAuthGuard, RegisteredUserGuard)
@ApiTags('Cart')
@ApiTelegramInitDataAuth()
@ApiUnauthorizedResponse({
  description: "Telegram initData header yuborilmagan yoki noto'g'ri.",
})
@ApiForbiddenResponse({
  description:
    "Foydalanuvchi bot orqali ro'yxatdan o'tmagan bo'lsa savat endpointlari yopiq bo'ladi.",
})
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({
    summary: 'Foydalanuvchi savatini olish',
    description:
      "Frontend uchun qulay bo'lishi uchun cart itemlar bilan birga umumiy summary ham qaytadi.",
  })
  @ApiOkResponse({
    type: CartResponseDoc,
  })
  getCart(@CurrentAuthUser() user: PublicUser) {
    return this.cartService.getCart(user);
  }

  @Post('items')
  @ApiOperation({
    summary: "Productni savatga qo'shish",
    description:
      "Agar savatda shu product allaqachon bo'lsa, quantity increment qilinadi.",
  })
  @ApiOkResponse({
    type: CartResponseDoc,
  })
  @ApiBadRequestResponse({
    description: "Faqat active bo'lgan product savatga qo'shiladi.",
  })
  addItem(@CurrentAuthUser() user: PublicUser, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user, dto);
  }

  @Patch('items/:productId')
  @ApiOperation({
    summary: "Savatdagi product quantity sini o'zgartirish",
  })
  @ApiParam({
    name: 'productId',
    example: 'cmnzd8xwd0002p6f0n8yz1abc',
  })
  @ApiOkResponse({
    type: CartResponseDoc,
  })
  @ApiBadRequestResponse({
    description:
      "Active bo'lmagan product quantity'sini o'zgartirib bo'lmaydi.",
  })
  updateItemQuantity(
    @CurrentAuthUser() user: PublicUser,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(user, productId, dto);
  }

  @Delete('items/:productId')
  @ApiOperation({
    summary: "Productni savatdan o'chirish",
  })
  @ApiParam({
    name: 'productId',
    example: 'cmnzd8xwd0002p6f0n8yz1abc',
  })
  @ApiOkResponse({
    type: CartResponseDoc,
  })
  removeItem(
    @CurrentAuthUser() user: PublicUser,
    @Param('productId') productId: string,
  ) {
    return this.cartService.removeItem(user, productId);
  }
}
