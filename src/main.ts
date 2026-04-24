import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { setupSwagger } from './docs/swagger';

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

function getAllowedCorsOrigins(): Set<string> {
  const rawOrigins = process.env.CORS_ALLOWED_ORIGINS ?? '';

  return new Set(
    rawOrigins
      .split(',')
      .map((origin) => normalizeOrigin(origin))
      .filter((origin) => origin.length > 0),
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = getAllowedCorsOrigins();

  app.enableShutdownHooks();
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);

      if (allowedOrigins.has(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS origin ruxsat etilmagan.'), false);
    },
    credentials: true,
  });
  app.use(compression());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  setupSwagger(app);
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
