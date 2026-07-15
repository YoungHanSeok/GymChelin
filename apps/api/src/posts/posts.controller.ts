// 게시글, 댓글, 좋아요 관련 HTTP API를 제공한다.
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
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PostsService } from './posts.service';

type PostQuery = {
  category?: string;
  page?: string;
  q?: unknown;
  keyword?: unknown;
  searchType?: string;
  sort?: string;
  take?: string;
};

type CreatePostBody = {
  category?: string;
  title?: string;
  content?: string;
};

type UpdatePostBody = {
  title?: string;
  content?: string;
};

type CreateCommentBody = {
  content?: string;
  parentId?: unknown;
};

type CommentReactionBody = {
  type?: string;
};

type RequestUser = {
  id: number;
  role?: string;
};

@Controller('api/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  findAll(@Query() query: PostQuery) {
    return this.postsService.findAll(query);
  }

  @Get('daily-popular')
  dailyPopular() {
    return this.postsService.dailyPopular();
  }

  @Get(':id/history')
  findHistory(@Param('id') id: string) {
    return this.postsService.findHistory(this.parsePostId(id));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(this.parsePostId(id));
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() body: CreatePostBody, @CurrentUser() user: RequestUser) {
    return this.postsService.create({
      category: body.category ?? '',
      title: body.title ?? '',
      content: body.content ?? '',
      authorId: user.id,
    });
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() body: UpdatePostBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.postsService.update(this.parsePostId(id), {
      title: body.title ?? '',
      content: body.content ?? '',
      editorId: user.id,
      editorRole: user.role,
    });
  }

  @Post(':id/comments')
  @UseGuards(AuthGuard)
  addComment(
    @Param('id') id: string,
    @Body() body: CreateCommentBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.postsService.addComment(this.parsePostId(id), {
      content: body.content ?? '',
      parentId: body.parentId,
      authorId: user.id,
    });
  }

  @Post(':id/comments/:commentId/reactions')
  @UseGuards(AuthGuard)
  reactComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body() body: CommentReactionBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.postsService.toggleCommentReaction({
      postId: this.parsePostId(id),
      commentId: this.parseCommentId(commentId),
      type: body.type ?? '',
      userId: user.id,
    });
  }

  @Delete(':id/comments/:commentId')
  @UseGuards(AuthGuard)
  deleteComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.postsService.deleteComment({
      postId: this.parsePostId(id),
      commentId: this.parseCommentId(commentId),
      userId: user.id,
      userRole: user.role,
    });
  }

  @Post(':id/like')
  @UseGuards(AuthGuard)
  like(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.postsService.toggleLike(this.parsePostId(id), user.id);
  }

  private parsePostId(id: string) {
    const postId = Number(id);

    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(postId)) {
      throw new BadRequestException('올바른 게시글 ID를 입력해 주세요.');
    }

    return postId;
  }

  private parseCommentId(id: string) {
    const commentId = Number(id);

    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(commentId)) {
      throw new BadRequestException('올바른 댓글 ID를 입력해 주세요.');
    }

    return commentId;
  }
}
