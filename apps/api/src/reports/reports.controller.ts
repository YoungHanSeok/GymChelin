// 게시글과 댓글 신고 접수 API를 제공한다.
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ReportsService } from './reports.service';

@Controller('api/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.reportsService.create({
      targetType: body.targetType,
      targetId: body.targetId,
      reason: body.reason,
      reporterId: user.id,
    });
  }
}
