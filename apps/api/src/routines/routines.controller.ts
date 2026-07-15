// 운동 루틴과 수행 일지 API를 제공한다.
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RoutineExerciseCatalogService } from './routine-exercise-catalog.service';
import { RoutinesService } from './routines.service';

type RoutineQuery = {
  q?: string;
  keyword?: string;
  searchType?: 'title' | 'titleContent' | 'author';
  page?: string;
  take?: string;
  sort?: string;
};

type ExerciseCatalogQuery = {
  q?: string;
  bodyPart?: string;
  equipment?: string;
  page?: string;
  take?: string;
};

type CreateRoutineBody = {
  title?: string;
  summary?: string;
  content?: string;
  tags?: unknown;
  days?: unknown;
};

type CreateCommentBody = {
  content?: string;
  parentId?: unknown;
};

type RequestUser = {
  id: number;
  role?: string;
};

@Controller('api/routines')
export class RoutinesController {
  constructor(
    private readonly routinesService: RoutinesService,
    private readonly exerciseCatalogService: RoutineExerciseCatalogService,
  ) {}

  @Get()
  findAll(@Query() query: RoutineQuery) {
    return this.routinesService.findAll(query);
  }

  @Get('exercise-catalog/filters')
  findExerciseCatalogFilters() {
    return this.exerciseCatalogService.findPublicFilters();
  }

  @Get('exercise-catalog')
  findExerciseCatalog(@Query() query: ExerciseCatalogQuery) {
    return this.exerciseCatalogService.findPublic(query);
  }

  @Get('import/:publicCode')
  findImportPreview(@Param('publicCode') publicCode: string) {
    return this.routinesService.findImportPreview(publicCode);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.routinesService.findOne(this.parseId(id, '루틴'));
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() body: CreateRoutineBody, @CurrentUser() user: RequestUser) {
    return this.routinesService.create({
      title: body.title ?? '',
      summary: body.summary,
      content: body.content,
      tags: body.tags,
      days: body.days,
      authorId: user.id,
    });
  }

  @Post(':id/comments')
  @UseGuards(AuthGuard)
  addComment(
    @Param('id') id: string,
    @Body() body: CreateCommentBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.routinesService.addComment(this.parseId(id, '루틴'), {
      content: body.content ?? '',
      parentId: body.parentId,
      authorId: user.id,
    });
  }

  @Delete(':id/comments/:commentId')
  @UseGuards(AuthGuard)
  deleteComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.routinesService.deleteComment({
      routineId: this.parseId(id, '루틴'),
      commentId: this.parseId(commentId, '댓글'),
      userId: user.id,
      userRole: user.role,
    });
  }

  @Post(':id/like')
  @UseGuards(AuthGuard)
  like(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.routinesService.toggleLike(this.parseId(id, '루틴'), user.id);
  }

  private parseId(id: string, label: string) {
    const parsedId = Number(id);

    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(parsedId)) {
      throw new BadRequestException(`올바른 ${label} ID를 입력해 주세요.`);
    }

    return parsedId;
  }
}
