// Prisma 데이터베이스 클라이언트를 전역으로 제공한다.
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // 다른 모듈에서 PrismaService를 바로 사용할 수 있도록 Global 설정
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
