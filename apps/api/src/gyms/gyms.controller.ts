// 카카오 장소 검색과 자체 헬스장 리뷰·댓글 API를 제공한다.
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GymsService } from './gyms.service';

type GymSearchQuery = {
  query?: unknown;
  region?: unknown;
  x?: unknown;
  y?: unknown;
  radius?: unknown;
  rect?: unknown;
  sort?: unknown;
};

type GymSearchRequest = {
  ip?: string;
  socket?: { remoteAddress?: string };
};

type CreateGymReviewBody = {
  rating?: unknown;
  content?: unknown;
  reviewTargetToken?: unknown;
};

type CreateGymReviewCommentBody = {
  content?: unknown;
  parentId?: unknown;
};

type RequestUser = {
  id: number;
  role?: string;
};

@Controller('api/gyms')
export class GymsController {
  constructor(private readonly gymsService: GymsService) {}

  @Get('search')
  search(@Query() query: GymSearchQuery, @Req() request: GymSearchRequest) {
    const clientAddress =
      request.ip?.trim() || request.socket?.remoteAddress?.trim() || 'unknown';

    return this.gymsService.search(query, clientAddress);
  }

  @Get(':providerPlaceId/reviews')
  findReviews(@Param('providerPlaceId') providerPlaceId: string) {
    return this.gymsService.findReviews(
      this.parseProviderPlaceId(providerPlaceId),
    );
  }

  @Post('reviews/:reviewId/comments')
  @UseGuards(AuthGuard)
  createReviewComment(
    @Param('reviewId') reviewId: string,
    @Body() body: CreateGymReviewCommentBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.gymsService.createReviewComment(
      this.parseNumericId(reviewId, '리뷰'),
      {
        content: body.content,
        parentId: body.parentId,
        authorId: user.id,
      },
    );
  }

  @Delete('reviews/:reviewId/comments/:commentId')
  @UseGuards(AuthGuard)
  deleteReviewComment(
    @Param('reviewId') reviewId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.gymsService.deleteReviewComment({
      reviewId: this.parseNumericId(reviewId, '리뷰'),
      commentId: this.parseNumericId(commentId, '댓글'),
      userId: user.id,
      userRole: user.role,
    });
  }

  @Post(':providerPlaceId/reviews')
  @UseGuards(AuthGuard)
  createReview(
    @Param('providerPlaceId') providerPlaceId: string,
    @Body() body: CreateGymReviewBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.gymsService.createReview(
      this.parseProviderPlaceId(providerPlaceId),
      {
        rating: body.rating,
        content: body.content,
        reviewTargetToken: body.reviewTargetToken,
        userId: user.id,
      },
    );
  }

  private parseProviderPlaceId(value: string) {
    if (!/^[1-9]\d{0,30}$/.test(value)) {
      throw new BadRequestException('올바른 카카오 장소 ID를 입력해 주세요.');
    }

    return value;
  }

  private parseNumericId(value: string, label: string) {
    const id = Number(value);

    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) {
      throw new BadRequestException(`올바른 ${label} ID를 입력해 주세요.`);
    }

    return id;
  }
}
