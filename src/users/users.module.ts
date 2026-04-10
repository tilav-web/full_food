import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TelegramUsersController } from './telegram-users.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [UsersController, TelegramUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
