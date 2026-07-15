// 회원 정보와 이메일 발송 기능을 구성한다.
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserMailService } from './user-mail.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserMailService],
  exports: [UsersService],
})
export class UsersModule {}
