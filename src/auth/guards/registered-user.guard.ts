import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { TelegramRequest } from '../interfaces/telegram-request.interface';

@Injectable()
export class RegisteredUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TelegramRequest>();

    if (!request.telegramAuth?.user) {
      throw new ForbiddenException(
        "Bu amal uchun foydalanuvchi avval bot orqali ro'yxatdan o'tgan bo'lishi kerak.",
      );
    }

    return true;
  }
}
