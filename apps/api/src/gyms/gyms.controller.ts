// 헬스장 검색, 상세 조회, 리뷰 작성 API를 제공한다.
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GymsService } from './gyms.service';

@Controller('api/gyms')
export class GymsController {
  constructor(private readonly gymsService: GymsService) {}

  @Get('search')
  search(@Query() query: any) {
    return this.gymsService.search(query);
  }

  @Get(':providerPlaceId')
  findOne(@Param('providerPlaceId') providerPlaceId: string) {
    return this.gymsService.findOne(providerPlaceId);
  }

  @Post(':providerPlaceId/reviews')
  @UseGuards(AuthGuard)
  createReview(
    @Param('providerPlaceId') providerPlaceId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.gymsService.createReview(providerPlaceId, {
      rating: body.rating,
      content: body.content,
      place: body.place,
      userId: user.id,
    });
  }
}
