import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PublicUser, UsersService } from '../users/users.service';

type TelegramInitDataUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  allows_write_to_pm?: boolean;
  photo_url?: string;
};

export type TelegramInitDataValidationResult = {
  valid: true;
  isRegistered: boolean;
  telegramUser: TelegramInitDataUser;
  user: PublicUser | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async verifyTelegramInitData(
    initData: string,
  ): Promise<TelegramInitDataValidationResult> {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');

    if (!botToken) {
      throw new InternalServerErrorException('TELEGRAM_BOT_TOKEN sozlanmagan.');
    }

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    if (!hash) {
      throw new UnauthorizedException('initData hash topilmadi.');
    }

    this.ensureInitDataIsFresh(params);

    const dataCheckString = Array.from(params.entries())
      .filter(([key]) => key !== 'hash')
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    const expectedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (!this.isHashValid(hash, expectedHash)) {
      throw new UnauthorizedException("initData imzosi noto'g'ri.");
    }

    const rawUser = params.get('user');

    if (!rawUser) {
      throw new UnauthorizedException(
        'initData ichida Telegram user topilmadi.',
      );
    }

    let telegramUser: TelegramInitDataUser;

    try {
      telegramUser = JSON.parse(rawUser) as TelegramInitDataUser;
    } catch {
      throw new UnauthorizedException("initData user maydoni noto'g'ri.");
    }

    const user = await this.usersService.findPublicByTelegramId(
      String(telegramUser.id),
    );

    return {
      valid: true,
      isRegistered: user !== null,
      telegramUser,
      user,
    };
  }

  private ensureInitDataIsFresh(params: URLSearchParams) {
    const authDate = params.get('auth_date');
    const maxAgeInSeconds = Number(
      this.configService.get<string>('TELEGRAM_INIT_DATA_MAX_AGE_SECONDS') ??
        '0',
    );

    if (!authDate || !maxAgeInSeconds) {
      return;
    }

    const authDateInSeconds = Number(authDate);

    if (Number.isNaN(authDateInSeconds)) {
      throw new UnauthorizedException("initData auth_date noto'g'ri.");
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);

    if (nowInSeconds - authDateInSeconds > maxAgeInSeconds) {
      throw new UnauthorizedException('initData eskirib qolgan.');
    }
  }

  private isHashValid(hash: string, expectedHash: string): boolean {
    if (hash.length !== expectedHash.length) {
      return false;
    }

    try {
      return timingSafeEqual(
        Buffer.from(hash, 'hex'),
        Buffer.from(expectedHash, 'hex'),
      );
    } catch {
      return false;
    }
  }
}
