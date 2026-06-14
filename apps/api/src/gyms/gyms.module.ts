import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GymsController } from './gyms.controller';
import { GymsService } from './gyms.service';

@Module({
  imports: [PrismaModule],
  controllers: [GymsController],
  providers: [GymsService],
})
export class GymsModule {}
