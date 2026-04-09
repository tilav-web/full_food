import { Module } from '@nestjs/common';
import { RegisteredUserGuard } from './guards/registered-user.guard';
import { RolesGuard } from './guards/roles.guard';
import { TelegramAuthGuard } from './guards/telegram-auth.guard';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, TelegramAuthGuard, RegisteredUserGuard, RolesGuard],
  exports: [AuthService, TelegramAuthGuard, RegisteredUserGuard, RolesGuard],
})
export class AuthModule {}
