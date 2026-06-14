import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AdsModule } from './ads/ads.module';
import { AuthModule } from './auth/auth.module';
import { GymsModule } from './gyms/gyms.module';
import { PostsModule } from './posts/posts.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { RoutinesModule } from './routines/routines.module';
import { UsersModule } from './users/users.module';
import { WikiModule } from './wiki/wiki.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    PostsModule,
    RoutinesModule,
    GymsModule,
    WikiModule,
    ReportsModule,
    AdminModule,
    AdsModule,
  ],
})
export class AppModule {}
