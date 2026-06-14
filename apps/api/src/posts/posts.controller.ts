import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PostsService } from './posts.service';

@Controller('api/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.postsService.findAll(query);
  }

  @Get('daily-popular')
  dailyPopular() {
    return this.postsService.dailyPopular();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(Number(id));
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.postsService.create({
      category: body.category,
      title: body.title,
      content: body.content,
      authorId: user.id,
    });
  }

  @Post(':id/comments')
  @UseGuards(AuthGuard)
  addComment(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.postsService.addComment(Number(id), {
      content: body.content,
      authorId: user.id,
    });
  }

  @Post(':id/like')
  @UseGuards(AuthGuard)
  like(@Param('id') id: string, @CurrentUser() user: any) {
    return this.postsService.toggleLike(Number(id), user.id);
  }
}
