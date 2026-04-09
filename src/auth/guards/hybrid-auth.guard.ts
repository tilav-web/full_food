import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TelegramRequest } from '../interfaces/telegram-request.interface';
import { AuthService } from '../auth.service';

@Injectable()
export class HybridAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TelegramRequest>();
    const telegramInitData = this.extractTelegramInitData(request);

    if (telegramInitData) {
      request.telegramAuth =
        await this.authService.verifyTelegramInitData(telegramInitData);
      request.authUser = request.telegramAuth.user;

      return true;
    }

    const accessToken = this.extractAccessToken(request);

    if (accessToken) {
      request.authUser = await this.authService.verifyAccessToken(accessToken);

      return true;
    }

    throw new UnauthorizedException(
      'Auth talab qilinadi. `x-telegram-init-data` yoki `Authorization: Bearer <token>` yuboring.',
    );
  }

  private extractTelegramInitData(request: TelegramRequest): string | null {
    const headerValue = request.headers['x-telegram-init-data'];

    if (typeof headerValue === 'string' && headerValue.trim()) {
      return headerValue.trim();
    }

    return null;
  }

  private extractAccessToken(request: TelegramRequest): string | null {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return null;
    }

    const token = authorization.slice('Bearer '.length).trim();

    return token || null;
  }
}
