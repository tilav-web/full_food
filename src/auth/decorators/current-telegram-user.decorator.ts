import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PublicUser } from '../../users/users.service';
import { TelegramRequest } from '../interfaces/telegram-request.interface';

export const CurrentTelegramUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PublicUser | null => {
    const request = context.switchToHttp().getRequest<TelegramRequest>();

    return request.telegramAuth?.user ?? null;
  },
);
