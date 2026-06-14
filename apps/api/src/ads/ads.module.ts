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
