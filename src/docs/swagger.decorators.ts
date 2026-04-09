import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiHeader,
  ApiSecurity,
} from '@nestjs/swagger';

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
  return applyDecorators(ApiCookieAuth('refresh-token-cookie'));
}
