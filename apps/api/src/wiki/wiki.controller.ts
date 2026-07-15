// 위키 조회와 관리자 편집 API를 제공한다.
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { WikiService } from './wiki.service';

@Controller('api/wiki')
export class WikiController {
  constructor(private readonly wikiService: WikiService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.wikiService.findAll(query);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.wikiService.findOne(slug);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() body: any) {
    return this.wikiService.create(body);
  }
}
