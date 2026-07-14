import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { RoutineExerciseCatalogService } from './routine-exercise-catalog.service';

type AdminCatalogQuery = {
  q?: string;
  targetBodyPart?: string;
  equipment?: string;
  status?: string;
  page?: string;
  take?: string;
};

type CatalogBody = {
  name?: unknown;
  targetBodyPart?: unknown;
  equipment?: unknown;
  isActive?: unknown;
};

@Controller('api/admin/routine-exercises')
@UseGuards(AdminGuard)
export class AdminRoutineExerciseCatalogController {
  constructor(
    private readonly exerciseCatalogService: RoutineExerciseCatalogService,
  ) {}

  @Get('options')
  getOptions() {
    return this.exerciseCatalogService.getOptions();
  }

  @Get()
  findAll(@Query() query: AdminCatalogQuery) {
    return this.exerciseCatalogService.findAdmin(query);
  }

  @Post()
  create(@Body() body: CatalogBody) {
    return this.exerciseCatalogService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: CatalogBody) {
    return this.exerciseCatalogService.update(this.parseId(id), body);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.exerciseCatalogService.deactivate(this.parseId(id));
  }

  private parseId(value: string) {
    const id = Number(value);

    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) {
      throw new BadRequestException('올바른 루틴 운동 ID를 입력해 주세요.');
    }

    return id;
  }
}
