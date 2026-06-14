import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RoutinesService } from './routines.service';

@Controller('api/routines')
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.routinesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.routinesService.findOne(Number(id));
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.routinesService.create({
      title: body.title,
      summary: body.summary,
      content: body.content,
      authorId: user.id,
    });
  }

  @Post(':id/like')
  @UseGuards(AuthGuard)
  like(@Param('id') id: string, @CurrentUser() user: any) {
    return this.routinesService.toggleLike(Number(id), user.id);
  }
}
