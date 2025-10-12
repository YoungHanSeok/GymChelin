import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 활성화
  app.enableCors({
    origin: 'http://localhost:3000', // Next.js 개발 서버 주소
    credentials: true,
  });

  await app.listen(3001); // 백엔드 서버는 3001 포트 사용
}
bootstrap();