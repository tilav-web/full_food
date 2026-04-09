import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiHeader,
  ApiSecurity,
} from '@nestjs/swagger';
import { DEFAULT_REFRESH_COOKIE_NAME } from '../auth/auth.constants';

export function ApiTelegramInitDataAuth() {
  return applyDecorators(
    ApiSecurity('telegram-init-data'),
    ApiHeader({
      name: 'x-telegram-init-data',
      required: false,
      description:
        'Tavsiya etilgan auth header. Telegram Mini App dan kelgan raw initData shu yerga yuboriladi.',
      example:
        'query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A123456789%7D&auth_date=1710000000&hash=abcdef',
    }),
  );
}

export function ApiWebBearerAuth() {
  return applyDecorators(ApiBearerAuth('access-token'));
}

export function ApiRefreshCookieAuth() {
  return applyDecorators(
    ApiCookieAuth('refresh-token-cookie'),
    ApiHeader({
      name: 'Cookie',
      required: false,
      description: `Refresh cookie avtomatik yuboriladi. Cookie nomi: \`${DEFAULT_REFRESH_COOKIE_NAME}\`.`,
      example: `${DEFAULT_REFRESH_COOKIE_NAME}=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example`,
    }),
  );
}
