// 사용자용 광고 조회와 최고 관리자용 배너 관리 API를 제공한다.
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { AdsService } from './ads.service';

const MAX_BANNER_IMAGE_SIZE = 2 * 1024 * 1024;
const BANNER_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

type BannerUploadFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

type BannerUploadFiles = {
  bannerImage?: BannerUploadFile[];
  defaultImage?: BannerUploadFile[];
};

type PlacementBody = {
  adsenseClient?: string | null;
  adsenseSlot?: string | null;
  enabled?: boolean;
};

type CreateBannerBody = {
  slot?: string;
  title?: string;
  imageUrl?: string;
  linkUrl?: string;
  startsAt?: string;
  endsAt?: string;
  priority?: number | string;
  isActive?: boolean;
};

@Controller('api/ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get('placements/:slot')
  getPlacement(@Param('slot') slot: string) {
    return this.adsService.getPublicPlacement(slot);
  }
}

@Controller('api/admin/ads')
@UseGuards(SuperAdminGuard)
export class AdminAdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get('slots')
  listSlots() {
    return this.adsService.listAdminSlots();
  }

  @Patch('slots/:slot')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'bannerImage', maxCount: 1 },
        { name: 'defaultImage', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: MAX_BANNER_IMAGE_SIZE,
          files: 2,
        },
        fileFilter: (_request, file, callback) => {
          if (!BANNER_IMAGE_MIME_TYPES.has(file.mimetype)) {
            callback(
              new BadRequestException(
                '배너 이미지는 JPEG, PNG, WebP, GIF 형식만 업로드할 수 있습니다.',
              ),
              false,
            );
            return;
          }

          callback(null, true);
        },
      },
    ),
  )
  updateSlot(
    @Param('slot') slot: string,
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files?: BannerUploadFiles,
  ) {
    return this.adsService.updateAdminSlot(slot, body, {
      bannerImage: files?.bannerImage?.[0],
      defaultImage: files?.defaultImage?.[0],
    });
  }

  @Get('placements')
  listPlacements() {
    return this.adsService.listPlacements();
  }

  @Patch('placements/:slot')
  upsertPlacement(@Param('slot') slot: string, @Body() body: PlacementBody) {
    return this.adsService.upsertPlacement(slot, body);
  }

  @Get('banners')
  listBanners() {
    return this.adsService.listBanners();
  }

  @Post('banners')
  createBanner(@Body() body: CreateBannerBody) {
    return this.adsService.createBanner(body);
  }
}
