// 운동 루틴, 일지, 운동 종목 카탈로그 기능을 구성한다.
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminRoutineExerciseCatalogController } from './routine-exercise-catalog.controller';
import { RoutineExerciseCatalogService } from './routine-exercise-catalog.service';
import { RoutinesController } from './routines.controller';
import { RoutinesService } from './routines.service';

@Module({
  imports: [PrismaModule],
  controllers: [RoutinesController, AdminRoutineExerciseCatalogController],
  providers: [RoutinesService, RoutineExerciseCatalogService],
})
export class RoutinesModule {}
