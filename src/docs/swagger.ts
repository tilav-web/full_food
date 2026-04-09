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
        'Autentifikatsiya uchun ikkita usuldan biri ishlatiladi:',
        '1. `x-telegram-init-data` header ichida raw Telegram `initData` yuborish.',
        '2. `Authorization` header ichida `tma <initData>` formatidan foydalanish.',
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
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        description: 'Alternativ usul: `tma <initData>` formatida yuboriladi.',
      },
      'telegram-tma',
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
