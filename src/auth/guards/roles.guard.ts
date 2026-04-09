import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { TelegramRequest } from '../interfaces/telegram-request.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TelegramRequest>();
    const user = request.authUser ?? request.telegramAuth?.user;

    if (!user) {
      throw new ForbiddenException(
        "Bu amal uchun tizimda ro'yxatdan o'tgan foydalanuvchi kerak.",
      );
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException("Sizda bu amal uchun ruxsat yo'q.");
    }

    return true;
  }
}
