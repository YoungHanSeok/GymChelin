import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [ReportsModule],
  controllers: [AdminController],
})
export class AdminModule {}
