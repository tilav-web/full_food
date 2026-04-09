import {
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client?: RedisClientType;
  private connectPromise?: Promise<void>;

  constructor(private readonly configService: ConfigService) {}

  async get(key: string): Promise<string | null> {
    const client = await this.getClient();

    return client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const client = await this.getClient();

    if (ttlSeconds) {
      await client.set(key, value, {
        EX: ttlSeconds,
      });
      return;
    }

    await client.set(key, value);
  }

  async setIfNotExists(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const client = await this.getClient();
    const result = await client.set(key, value, {
      NX: true,
      EX: ttlSeconds,
    });

    return result === 'OK';
  }

  async delete(...keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    const client = await this.getClient();

    await client.del(keys);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const client = await this.getClient();

    await client.expire(key, ttlSeconds);
  }

  async onModuleDestroy() {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      const redisUrl =
        this.configService.get<string>('REDIS_URL') ?? 'redis://127.0.0.1:6379';

      this.client = createClient({
        url: redisUrl,
      });
      this.client.on('error', (error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Redis xatoligi: ${message}`);
      });
    }

    if (!this.client.isOpen) {
      this.connectPromise ??= this.client
        .connect()
        .then(() => undefined)
        .catch((error: unknown) => {
          this.connectPromise = undefined;
          const message =
            error instanceof Error ? error.message : String(error);

          throw new ServiceUnavailableException(
            `Redis hozircha mavjud emas: ${message}`,
          );
        });

      await this.connectPromise;
      this.connectPromise = undefined;
    }

    return this.client;
  }
}
