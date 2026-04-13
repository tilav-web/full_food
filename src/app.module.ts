import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { BotModule } from './bot/bot.module';
import { CartModule } from './cart/cart.module';
import { CategoriesModule } from './categories/categories.module';
import { LocationsModule } from './locations/locations.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { UnitsModule } from './units/units.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    BotModule,
    CartModule,
    CategoriesModule,
    UnitsModule,
    ProductsModule,
    OrdersModule,
    LocationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
