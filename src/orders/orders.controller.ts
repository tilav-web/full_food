import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentTelegramUser } from '../auth/decorators/current-telegram-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RegisteredUserGuard } from '../auth/guards/registered-user.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';
import {
  ApiTelegramInitDataAuth,
  ApiWebBearerAuth,
} from '../docs/swagger.decorators';
import { OrderListResponseDoc, OrderResponseDoc } from '../docs/swagger.models';
import type { PublicUser } from '../users/users.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@ApiTags('Orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @UseGuards(TelegramAuthGuard, RegisteredUserGuard)
  @ApiTelegramInitDataAuth()
  @ApiOperation({
    summary: 'Buyurtma yaratish',
    description:
      'Mini App frontend savat bilan birga delivery ma`lumotlari va location koordinatalarini yuboradi. Order shu zahoti yaratiladi.',
  })
  @ApiOkResponse({
    type: OrderResponseDoc,
  })
  @ApiUnauthorizedResponse({
    description: 'Telegram initData yuborilmagan yoki noto`g`ri.',
  })
  @ApiBadRequestResponse({
    description: 'Savat bo`sh yoki active bo`lmagan product mavjud.',
  })
  checkout(
    @CurrentTelegramUser() user: PublicUser,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.ordersService.checkout(user, dto);
  }

  @Get('me')
  @UseGuards(TelegramAuthGuard, RegisteredUserGuard)
  @ApiTelegramInitDataAuth()
  @ApiOperation({
    summary: 'User orderlari ro`yxati',
    description:
      'Mini app user o`zining final orderlarini pagination bilan oladi.',
  })
  @ApiOkResponse({
    type: OrderListResponseDoc,
  })
  listMyOrders(
    @CurrentTelegramUser() user: PublicUser,
    @Query() query: ListOrdersQueryDto,
  ) {
    return this.ordersService.listMyOrders(user, query);
  }

  @Get('me/:id')
  @UseGuards(TelegramAuthGuard, RegisteredUserGuard)
  @ApiTelegramInitDataAuth()
  @ApiOperation({
    summary: 'Userning bitta orderi',
  })
  @ApiParam({
    name: 'id',
    example: 'cmob1234k0001p6abcxyz789',
  })
  @ApiOkResponse({
    type: OrderResponseDoc,
  })
  findMyOrder(
    @CurrentTelegramUser() user: PublicUser,
    @Param('id') id: string,
  ) {
    return this.ordersService.findMyOrder(user, id);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.CASHIER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiWebBearerAuth()
  @ApiOperation({
    summary: 'Barcha orderlarni olish',
    description:
      'Admin yoki kassir orderlarni status, payment status, search va pagination bilan ko`ra oladi.',
  })
  @ApiOkResponse({
    type: OrderListResponseDoc,
  })
  listOrders(@Query() query: ListOrdersQueryDto) {
    return this.ordersService.listOrders(query);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.CASHIER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiWebBearerAuth()
  @ApiOperation({
    summary: 'Bitta orderni olish',
  })
  @ApiParam({
    name: 'id',
    example: 'cmob1234k0001p6abcxyz789',
  })
  @ApiOkResponse({
    type: OrderResponseDoc,
  })
  findOrder(@Param('id') id: string) {
    return this.ordersService.findOrder(id);
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.CASHIER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiWebBearerAuth()
  @ApiOperation({
    summary: 'Order statusini yangilash',
    description:
      '`NEW -> ACCEPTED -> PREPARING -> COMPLETED` zanjiri bo`yicha ishlaydi. `CANCELLED` bo`lsa payment ham avtomatik `CANCELLED` bo`ladi.',
  })
  @ApiParam({
    name: 'id',
    example: 'cmob1234k0001p6abcxyz789',
  })
  @ApiOkResponse({
    type: OrderResponseDoc,
  })
  @ApiBadRequestResponse({
    description: 'Status transition noto`g`ri yoki cancel reason yuborilmagan.',
  })
  updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, dto);
  }

  @Patch(':id/payment-status')
  @Roles(Role.SUPER_ADMIN, Role.CASHIER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiWebBearerAuth()
  @ApiOperation({
    summary: 'To`lov statusini yangilash',
    description:
      'To`lov provider yo`q bo`lgani uchun kassir yoki admin orderning payment statusini qo`lda boshqaradi.',
  })
  @ApiParam({
    name: 'id',
    example: 'cmob1234k0001p6abcxyz789',
  })
  @ApiOkResponse({
    type: OrderResponseDoc,
  })
  @ApiBadRequestResponse({
    description:
      '`CANCELLED` payment statusi qo`lda berilmaydi va bekor qilingan orderlar uchun payment o`zgarmaydi.',
  })
  updatePaymentStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.ordersService.updatePaymentStatus(id, dto);
  }
}
