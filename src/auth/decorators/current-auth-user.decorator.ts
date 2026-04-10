import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PublicUser } from '../../users/users.service';
import { TelegramRequest } from '../interfaces/telegram-request.interface';

export const CurrentAuthUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PublicUser | null => {
    const request = context.switchToHttp().getRequest<TelegramRequest>();

    return request.authUser ?? request.telegramAuth?.user ?? null;
  },
);
