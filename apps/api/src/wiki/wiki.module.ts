// 웨이트 위키 기능을 구성한다.
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WikiController } from './wiki.controller';
import { WikiService } from './wiki.service';

@Module({
  imports: [PrismaModule],
  controllers: [WikiController],
  providers: [WikiService],
})
export class WikiModule {}
