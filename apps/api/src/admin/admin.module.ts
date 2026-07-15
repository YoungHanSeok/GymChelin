// 관리자 기능에 필요한 컨트롤러와 의존 모듈을 묶는다.
import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module';
import { UsersModule } from '../users/users.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [ReportsModule, UsersModule],
  controllers: [AdminController, AdminUsersController],
  providers: [AdminUsersService],
})
export class AdminModule {}
