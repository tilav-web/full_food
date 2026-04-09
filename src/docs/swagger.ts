import { DEFAULT_REFRESH_COOKIE_NAME } from '../auth/auth.constants';
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const port = process.env.PORT ?? 3000;

  const config = new DocumentBuilder()
    .setTitle('Full Food API')
    .setDescription(
      [
        'Telegram Mini App backend API dokumentatsiyasi.',
        '',
        'Autentifikatsiya ikki oqimga bo`lingan:',
        '1. Mini App userlar uchun `x-telegram-init-data` header ishlatiladi.',
        '2. Web admin/kassir uchun `Authorization: Bearer <access_token>` ishlatiladi.',
        '3. Refresh endpointi httpOnly cookie orqali ishlaydi.',
        '',
        'Admin CRUD route`lari faqat `SUPER_ADMIN` uchun ochiq.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addServer(`http://localhost:${port}`, 'Local development')
    .addTag('Auth', 'Telegram Mini App initData verification endpointlari')
    .addTag('Categories', 'Product category CRUD va listing endpointlari')
    .addTag(
      'Products',
      'Product CRUD, search, filter va pagination endpointlari',
    )
    .addTag('Cart', 'Foydalanuvchi savati va cart summary endpointlari')
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-telegram-init-data',
        description:
          'Tavsiya etilgan usul: Telegram Mini App dan kelgan raw initData qiymati.',
      },
      'telegram-init-data',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Web admin va kassir uchun access token. `Authorization: Bearer <token>` formatida yuboriladi.',
      },
      'access-token',
    )
    .addCookieAuth(
      DEFAULT_REFRESH_COOKIE_NAME,
      {
        type: 'apiKey',
        in: 'cookie',
        name: DEFAULT_REFRESH_COOKIE_NAME,
        description: 'Web session refresh qilish uchun httpOnly cookie.',
      },
      'refresh-token-cookie',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,
  });

  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Full Food API Docs',
    jsonDocumentUrl: 'docs/openapi.json',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
}
