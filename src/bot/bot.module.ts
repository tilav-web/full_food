import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [BotController],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
