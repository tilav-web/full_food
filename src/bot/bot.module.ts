import { forwardRef, Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { BotService } from './bot.service';

@Module({
  imports: [UsersModule, forwardRef(() => OrdersModule)],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
