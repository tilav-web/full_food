import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HybridAuthGuard } from './guards/hybrid-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisteredUserGuard } from './guards/registered-user.guard';
import { RolesGuard } from './guards/roles.guard';
import { TelegramAuthGuard } from './guards/telegram-auth.guard';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [forwardRef(() => UsersModule), JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    TelegramAuthGuard,
    HybridAuthGuard,
    JwtAuthGuard,
    RegisteredUserGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    TelegramAuthGuard,
    HybridAuthGuard,
    JwtAuthGuard,
    RegisteredUserGuard,
    RolesGuard,
  ],
})
export class AuthModule {}
