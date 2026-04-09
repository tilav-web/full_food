import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TelegramRequest } from '../interfaces/telegram-request.interface';
import { AuthService } from '../auth.service';

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TelegramRequest>();
    const initData = this.extractInitData(request);

    if (!initData) {
      throw new UnauthorizedException('Telegram initData yuborilmadi.');
    }

    request.telegramAuth =
      await this.authService.verifyTelegramInitData(initData);

    return true;
  }

  private extractInitData(request: TelegramRequest): string | null {
    const headerValue = request.headers['x-telegram-init-data'];

    if (typeof headerValue === 'string' && headerValue.trim()) {
      return headerValue.trim();
    }

    return null;
  }
}
