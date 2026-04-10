import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BotModule } from '../bot/bot.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule, BotModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
