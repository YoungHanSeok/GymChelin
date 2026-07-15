// 토큰과 인증 상태 저장에 사용하는 Redis 연결을 관리한다.
import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createClient } from 'redis';

const REDIS_UNAVAILABLE_MESSAGE =
  '현재 로그인을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client = createClient({
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    socket: {
      connectTimeout: 1000,
      reconnectStrategy: false,
    },
  });

  private connectPromise: Promise<void> | null = null;
  private lastError: unknown;

  constructor() {
    this.client.on('error', (error) => {
      this.lastError = error;
    });
  }

  async onModuleDestroy() {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number) {
    await this.connect();
    await this.client.set(key, JSON.stringify(value), {
      EX: ttlSeconds,
    });
  }

  async getJson<T>(key: string): Promise<T | null> {
    await this.connect();
    const value = await this.client.get(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      await this.delete(key);
      return null;
    }
  }

  async delete(key: string) {
    await this.connect();
    await this.client.del(key);
  }

  getLastError() {
    return this.lastError;
  }

  private async connect() {
    if (this.client.isOpen) {
      return;
    }

    this.connectPromise ??= this.client
      .connect()
      .then(() => undefined)
      .catch((error: unknown) => {
        this.connectPromise = null;
        this.lastError = error;
        throw new ServiceUnavailableException(REDIS_UNAVAILABLE_MESSAGE);
      });

    await this.connectPromise;
  }
}
