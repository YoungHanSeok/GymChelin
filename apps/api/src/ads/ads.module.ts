// 광고 슬롯과 배너 관리 기능을 구성한다.
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdsController, AdminAdsController } from './ads.controller';
import { AdsService } from './ads.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdsController, AdminAdsController],
  providers: [AdsService],
})
export class AdsModule {}
