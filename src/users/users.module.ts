import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TelegramUsersController } from './telegram-users.controller';
import { WebUsersController } from './web-users.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [UsersController, TelegramUsersController, WebUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
