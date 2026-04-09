import { applyDecorators } from '@nestjs/common';
import { ApiHeader, ApiSecurity } from '@nestjs/swagger';

export function ApiTelegramInitDataAuth() {
  return applyDecorators(
    ApiSecurity('telegram-init-data'),
    ApiSecurity('telegram-tma'),
    ApiHeader({
      name: 'x-telegram-init-data',
      required: false,
      description:
        'Tavsiya etilgan auth header. Telegram Mini App dan kelgan raw initData shu yerga yuboriladi.',
      example:
        'query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A123456789%7D&auth_date=1710000000&hash=abcdef',
    }),
    ApiHeader({
      name: 'Authorization',
      required: false,
      description: 'Alternativ auth format: `tma <initData>`.',
      example:
        'tma query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A123456789%7D&auth_date=1710000000&hash=abcdef',
    }),
  );
}
