import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdsService } from './ads.service';

@Controller('api/ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get('placements/:slot')
  getPlacement(@Param('slot') slot: string) {
    return this.adsService.getPublicPlacement(slot);
  }
}

@Controller('api/admin/ads')
@UseGuards(AdminGuard)
export class AdminAdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get('placements')
  listPlacements() {
    return this.adsService.listPlacements();
  }

  @Patch('placements/:slot')
  upsertPlacement(@Param('slot') slot: string, @Body() body: any) {
    return this.adsService.upsertPlacement(slot, body);
  }

  @Get('banners')
  listBanners() {
    return this.adsService.listBanners();
  }

  @Post('banners')
  createBanner(@Body() body: any) {
    return this.adsService.createBanner(body);
  }
}
