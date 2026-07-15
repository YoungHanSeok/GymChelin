// 데이터베이스 연결 수명 주기와 개발용 SQL 로그를 관리한다.
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query'>
  implements OnModuleInit
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // 운영 환경에서는 SQL 파라미터가 로그에 남지 않도록 쿼리 이벤트를 등록하지 않는다.
    const isDevelopment = process.env.NODE_ENV !== 'production';

    super({
      log: isDevelopment
        ? [{ emit: 'event', level: 'query' }, 'error']
        : ['error'],
    });

    if (isDevelopment) {
      this.$on('query', (event) => {
        this.logger.debug(
          `SQL: ${event.query} | params: ${event.params} | ${event.duration}ms`,
        );
      });
    }
  }

  async onModuleInit() {
    await this.$connect(); // 모듈 초기화 시 DB 연결
  }
}
