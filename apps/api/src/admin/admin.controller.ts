// 관리자 신고 처리와 게시글 관리 API를 제공한다.
import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ReportsService } from '../reports/reports.service';

@Controller('api/admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('reports')
  reports(@Query() query: any) {
    return this.reportsService.findAdminReports(query);
  }

  @Patch('moderation/:targetType/:targetId/blind')
  blind(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.reportsService.blind({
      targetType,
      targetId: Number(targetId),
      reason: body.reason,
      adminId: user.id,
    });
  }
}
