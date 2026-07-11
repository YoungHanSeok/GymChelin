import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { UsersModule } from '../users/users.module';
import { AdminGuard } from './admin.guard';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { SuperAdminGuard } from './super-admin.guard';

@Global()
@Module({
  imports: [PrismaModule, RedisModule, UsersModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AdminGuard, SuperAdminGuard],
  exports: [AuthService, AuthGuard, AdminGuard, SuperAdminGuard],
})
export class AuthModule {}
