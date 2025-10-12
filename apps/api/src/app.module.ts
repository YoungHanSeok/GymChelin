import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module'; // PrismaModule import
import { UsersModule } from './users/users.module'; // 생성할 UsersModule import

@Module({
  imports: [PrismaModule, UsersModule], // PrismaModule과 UsersModule 등록
  controllers: [],
  providers: [],
})
export class AppModule {}