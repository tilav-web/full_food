import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import type { StringValue } from 'ms';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Response } from 'express';
import {
  DEFAULT_ACCESS_EXPIRES_IN,
  DEFAULT_REFRESH_COOKIE_MAX_AGE_MS,
  DEFAULT_REFRESH_COOKIE_NAME,
  DEFAULT_REFRESH_EXPIRES_IN,
} from './auth.constants';
import { LoginWithPasswordDto } from './dto/login-with-password.dto';
import { normalizeUzbekPhoneNumber } from '../users/phone.util';
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

type AccessTokenPayload = {
  sub: string;
  role: Role;
};

export type PasswordLoginResponse = {
  accessToken: string;
  user: PublicUser;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async loginWithPassword(
    dto: LoginWithPasswordDto,
    response: Response,
  ): Promise<PasswordLoginResponse> {
    const phone = this.normalizePhone(dto.phone);
    const user = await this.usersService.findByPhone(phone);

    if (!user || !user.password) {
      throw new UnauthorizedException("Telefon yoki parol noto'g'ri.");
    }

    this.ensureUserCanUseWebAuth(user);

    const isPasswordValid = await compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Telefon yoki parol noto'g'ri.");
    }

    return this.issueWebTokens(user, response);
  }

  async refreshWebSession(
    cookies: Record<string, string | undefined>,
    response: Response,
  ): Promise<PasswordLoginResponse> {
    const refreshToken = cookies[this.getRefreshCookieName()];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token cookie topilmadi.');
    }

    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        refreshToken,
        {
          secret: this.getRefreshTokenSecret(),
        },
      );
    } catch {
      throw new UnauthorizedException("Refresh token noto'g'ri yoki eskirgan.");
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Session topilmadi.');
    }

    this.ensureUserCanUseWebAuth(user);

    const isRefreshTokenValid = await compare(
      refreshToken,
      user.refreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Refresh token mos kelmadi.');
    }

    return this.issueWebTokens(user, response);
  }

  async logoutWebSession(
    cookies: Record<string, string | undefined>,
    response: Response,
  ): Promise<{ message: string }> {
    const refreshToken = cookies[this.getRefreshCookieName()];

    this.clearRefreshTokenCookie(response);

    if (refreshToken) {
      try {
        const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
          refreshToken,
          {
            secret: this.getRefreshTokenSecret(),
          },
        );

        await this.usersService.updateRefreshTokenHash(payload.sub, null);
      } catch {
        return {
          message: 'Session yopildi.',
        };
      }
    }

    return {
      message: 'Session yopildi.',
    };
  }

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

  async verifyAccessToken(accessToken: string): Promise<PublicUser> {
    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        accessToken,
        {
          secret: this.getAccessTokenSecret(),
        },
      );
    } catch {
      throw new UnauthorizedException("Access token noto'g'ri yoki eskirgan.");
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi.');
    }

    return this.usersService.toPublicUser(user);
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

  private ensureUserCanUseWebAuth(user: User) {
    const webAuthRoles: Role[] = [Role.SUPER_ADMIN, Role.CASHIER];

    if (!webAuthRoles.includes(user.role)) {
      throw new UnauthorizedException(
        'Web login faqat super admin va kassir uchun ochiq.',
      );
    }
  }

  private normalizePhone(phone: string): string {
    try {
      return normalizeUzbekPhoneNumber(phone);
    } catch {
      throw new UnauthorizedException("Telefon yoki parol noto'g'ri.");
    }
  }

  private async issueWebTokens(
    user: User,
    response: Response,
  ): Promise<PasswordLoginResponse> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      role: user.role,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.getAccessTokenSecret(),
        expiresIn: this.getAccessTokenExpiresIn(),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.getRefreshTokenSecret(),
        expiresIn: this.getRefreshTokenExpiresIn(),
      }),
    ]);
    const refreshTokenHash = await hash(refreshToken, 10);

    await this.usersService.updateRefreshTokenHash(user.id, refreshTokenHash);
    this.setRefreshTokenCookie(response, refreshToken);

    return {
      accessToken,
      user: this.usersService.toPublicUser(user),
    };
  }

  private setRefreshTokenCookie(response: Response, refreshToken: string) {
    response.cookie(this.getRefreshCookieName(), refreshToken, {
      httpOnly: true,
      secure: this.isRefreshCookieSecure(),
      sameSite: 'lax',
      path: '/auth/web',
      maxAge: this.getRefreshCookieMaxAgeMs(),
    });
  }

  private clearRefreshTokenCookie(response: Response) {
    response.clearCookie(this.getRefreshCookieName(), {
      httpOnly: true,
      secure: this.isRefreshCookieSecure(),
      sameSite: 'lax',
      path: '/auth/web',
    });
  }

  private getAccessTokenSecret(): string {
    return (
      this.configService.get<string>('JWT_ACCESS_SECRET') ??
      'change-me-access-secret'
    );
  }

  private getRefreshTokenSecret(): string {
    return (
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
      'change-me-refresh-secret'
    );
  }

  private getAccessTokenExpiresIn(): StringValue {
    return (this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ??
      DEFAULT_ACCESS_EXPIRES_IN) as StringValue;
  }

  private getRefreshTokenExpiresIn(): StringValue {
    return (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ??
      DEFAULT_REFRESH_EXPIRES_IN) as StringValue;
  }

  private getRefreshCookieName(): string {
    return (
      this.configService.get<string>('AUTH_REFRESH_COOKIE_NAME') ??
      DEFAULT_REFRESH_COOKIE_NAME
    );
  }

  private getRefreshCookieMaxAgeMs(): number {
    const rawValue = Number(
      this.configService.get<string>('AUTH_REFRESH_COOKIE_MAX_AGE_MS') ??
        DEFAULT_REFRESH_COOKIE_MAX_AGE_MS,
    );

    return Number.isNaN(rawValue)
      ? DEFAULT_REFRESH_COOKIE_MAX_AGE_MS
      : rawValue;
  }

  private isRefreshCookieSecure(): boolean {
    const rawValue =
      this.configService.get<string>('AUTH_REFRESH_COOKIE_SECURE') ?? 'false';

    return ['true', '1', 'yes', 'on'].includes(rawValue.toLowerCase());
  }
}
