// 광고 슬롯별 표시 규칙과 배너 데이터를 관리한다.
import { BadRequestException, Injectable } from '@nestjs/common';
import { AdSlot, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MAX_BANNER_IMAGE_SIZE = 2 * 1024 * 1024;
const BANNER_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const AD_SLOT_LABELS: Record<AdSlot, string> = {
  MAIN_TOP: '상단 배너',
  MAIN_LEFT: '왼쪽 배너',
  MAIN_RIGHT: '오른쪽 배너',
  POST_LIST_INLINE: '게시글 중간 배너',
  GYM_DETAIL_SIDE: '헬스장 상세 배너',
};

type BannerUploadFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

type BannerUploadFiles = {
  bannerImage?: BannerUploadFile;
  defaultImage?: BannerUploadFile;
};

type PlacementInput = {
  adsenseClient?: string | null;
  adsenseSlot?: string | null;
  enabled?: boolean;
};

type CreateBannerInput = {
  slot?: string;
  title?: string;
  imageUrl?: string;
  linkUrl?: string;
  startsAt?: string;
  endsAt?: string;
  priority?: number | string;
  isActive?: boolean;
};

type AdPlacementRecord = {
  id: number;
  slot: AdSlot;
  adsenseClient: string | null;
  adsenseSlot: string | null;
  defaultImageUrl: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type DirectBannerRecord = {
  id: number;
  slot: AdSlot;
  title: string;
  imageUrl: string;
  linkUrl: string;
  startsAt: Date;
  endsAt: Date | null;
  priority: number;
  impressions: number;
  clicks: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type BannerPrismaClient = Pick<Prisma.TransactionClient, 'directBanner'>;

@Injectable()
export class AdsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicPlacement(slotParam: string) {
    const slot = this.parseSlot(slotParam);
    const now = new Date();
    const banner = await this.prisma.directBanner.findFirst({
      where: {
        slot,
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    if (banner) {
      await this.prisma.directBanner.update({
        where: { id: banner.id },
        data: { impressions: { increment: 1 } },
      });

      return {
        type: 'DIRECT',
        slot,
        banner,
      };
    }

    const placement = await this.prisma.adPlacement.findUnique({
      where: { slot },
    });

    if (placement?.defaultImageUrl) {
      return {
        type: 'DEFAULT',
        slot,
        imageUrl: placement.defaultImageUrl,
      };
    }

    const adsenseClient =
      placement?.adsenseClient ?? process.env.ADSENSE_CLIENT;
    const adsenseSlot =
      placement?.adsenseSlot ?? process.env[`ADSENSE_SLOT_${slot}`];

    if (placement?.enabled !== false && adsenseClient && adsenseSlot) {
      return {
        type: 'ADSENSE',
        slot,
        adsenseClient,
        adsenseSlot,
      };
    }

    return {
      type: 'PLACEHOLDER',
      slot,
      label: '광고 영역',
    };
  }

  async listAdminSlots() {
    const [placements, banners] = await this.prisma.$transaction([
      this.prisma.adPlacement.findMany(),
      this.prisma.directBanner.findMany({
        where: { isActive: true },
        orderBy: [
          { updatedAt: 'desc' },
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
    ]);
    const placementBySlot = new Map(
      placements.map((placement) => [placement.slot, placement]),
    );
    const bannerBySlot = new Map<AdSlot, DirectBannerRecord>();

    for (const banner of banners) {
      if (!bannerBySlot.has(banner.slot)) {
        bannerBySlot.set(banner.slot, banner);
      }
    }

    return {
      items: Object.values(AdSlot).map((slot) =>
        this.toAdminSlot(
          slot,
          placementBySlot.get(slot) ?? null,
          bannerBySlot.get(slot) ?? null,
        ),
      ),
    };
  }

  async updateAdminSlot(
    slotParam: string,
    body: Record<string, unknown>,
    files: BannerUploadFiles,
  ) {
    const slot = this.parseSlot(slotParam);
    const removeBannerImage = this.parseBooleanFlag(
      body.removeBannerImage,
      '예약 배너 삭제 여부',
    );
    const removeDefaultImage = this.parseBooleanFlag(
      body.removeDefaultImage,
      '기본 이미지 삭제 여부',
    );
    const noExpiry = this.parseBooleanFlag(
      body.noExpiry,
      '예약 배너 기간 없음 여부',
    );
    const bannerImageUrl = files.bannerImage
      ? this.toImageDataUrl(files.bannerImage)
      : undefined;
    const defaultImageUrl = files.defaultImage
      ? this.toImageDataUrl(files.defaultImage)
      : undefined;
    const startsAt = this.parseOptionalDate(body, 'startsAt', '시작 일시');
    const endsAt = noExpiry
      ? null
      : this.parseOptionalDate(body, 'endsAt', '종료 일시');
    const hasScheduledFields =
      startsAt !== undefined || (!noExpiry && endsAt !== undefined);

    if (removeBannerImage && (bannerImageUrl || hasScheduledFields)) {
      throw new BadRequestException(
        '예약 배너 저장과 삭제는 동시에 요청할 수 없습니다.',
      );
    }

    if (removeDefaultImage && defaultImageUrl) {
      throw new BadRequestException(
        '기본 이미지 저장과 삭제는 동시에 요청할 수 없습니다.',
      );
    }

    await this.prisma.$transaction(async (transaction) => {
      const currentBanner = await this.findManagedBanner(transaction, slot);

      if (removeBannerImage) {
        await transaction.directBanner.updateMany({
          where: { slot, isActive: true },
          data: { isActive: false },
        });
      } else if (currentBanner || bannerImageUrl || hasScheduledFields) {
        if (!startsAt) {
          throw new BadRequestException(
            '예약 배너의 시작 일시를 입력해 주세요.',
          );
        }

        if (!noExpiry && !endsAt) {
          throw new BadRequestException(
            '예약 배너의 종료 일시를 입력해 주세요.',
          );
        }

        if (endsAt && startsAt >= endsAt) {
          throw new BadRequestException(
            '예약 배너 종료 일시는 시작 일시보다 이후여야 합니다.',
          );
        }

        if (currentBanner) {
          await transaction.directBanner.updateMany({
            where: {
              slot,
              isActive: true,
              id: { not: currentBanner.id },
            },
            data: { isActive: false },
          });
          await transaction.directBanner.update({
            where: { id: currentBanner.id },
            data: {
              ...(bannerImageUrl ? { imageUrl: bannerImageUrl } : {}),
              title: AD_SLOT_LABELS[slot],
              linkUrl: '',
              startsAt,
              endsAt,
              priority: 0,
              isActive: true,
            },
          });
        } else {
          if (!bannerImageUrl) {
            throw new BadRequestException(
              '새 예약 배너 이미지를 업로드해 주세요.',
            );
          }

          await transaction.directBanner.create({
            data: {
              slot,
              title: AD_SLOT_LABELS[slot],
              imageUrl: bannerImageUrl,
              linkUrl: '',
              startsAt,
              endsAt,
              priority: 0,
              isActive: true,
            },
          });
        }
      }

      if (defaultImageUrl) {
        await transaction.adPlacement.upsert({
          where: { slot },
          create: {
            slot,
            defaultImageUrl,
            enabled: true,
          },
          update: { defaultImageUrl },
        });
      } else if (removeDefaultImage) {
        await transaction.adPlacement.updateMany({
          where: { slot },
          data: { defaultImageUrl: null },
        });
      }
    });

    return this.getAdminSlot(slot);
  }

  listPlacements() {
    return this.prisma.adPlacement.findMany({ orderBy: { slot: 'asc' } });
  }

  upsertPlacement(slotParam: string, body: PlacementInput) {
    const slot = this.parseSlot(slotParam);

    return this.prisma.adPlacement.upsert({
      where: { slot },
      create: {
        slot,
        adsenseClient: body.adsenseClient,
        adsenseSlot: body.adsenseSlot,
        enabled: body.enabled ?? true,
      },
      update: {
        adsenseClient: body.adsenseClient,
        adsenseSlot: body.adsenseSlot,
        enabled: body.enabled ?? true,
      },
    });
  }

  listBanners() {
    return this.prisma.directBanner.findMany({
      orderBy: [
        { isActive: 'desc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async createBanner(body: CreateBannerInput) {
    const slot = this.parseSlot(body.slot ?? '');

    if (
      !body.title ||
      !body.imageUrl ||
      !body.linkUrl ||
      !body.startsAt ||
      !body.endsAt
    ) {
      throw new BadRequestException(
        '배너 제목, 이미지, 링크, 시작일, 종료일은 필수입니다.',
      );
    }

    const title = body.title.trim();
    if (!title || title.length > 120) {
      throw new BadRequestException('배너 제목은 120자 이하로 입력해 주세요.');
    }

    const imageUrl = this.parseImageDataUrl(body.imageUrl);
    const linkUrl = this.parseBannerLink(body.linkUrl);
    const startsAt = this.parseLegacyBannerDate(body.startsAt, '시작일');
    const endsAt = this.parseLegacyBannerDate(body.endsAt, '종료일');
    if (startsAt >= endsAt) {
      throw new BadRequestException(
        '배너 종료 일시는 시작 일시보다 이후여야 합니다.',
      );
    }

    const priority = Number(body.priority ?? 0);
    if (!Number.isSafeInteger(priority)) {
      throw new BadRequestException('배너 우선순위는 정수여야 합니다.');
    }
    const isActive = body.isActive ?? true;

    return this.prisma.$transaction(async (transaction) => {
      if (isActive) {
        await transaction.directBanner.updateMany({
          where: { slot, isActive: true },
          data: { isActive: false },
        });
      }

      return transaction.directBanner.create({
        data: {
          slot,
          title,
          imageUrl,
          linkUrl,
          startsAt,
          endsAt,
          priority,
          isActive,
        },
      });
    });
  }

  private async getAdminSlot(slot: AdSlot) {
    const [placement, banner] = await Promise.all([
      this.prisma.adPlacement.findUnique({ where: { slot } }),
      this.findManagedBanner(this.prisma, slot),
    ]);

    return this.toAdminSlot(slot, placement, banner);
  }

  private toAdminSlot(
    slot: AdSlot,
    placement: AdPlacementRecord | null,
    scheduledBanner: DirectBannerRecord | null,
  ) {
    return {
      slot,
      label: AD_SLOT_LABELS[slot],
      banner: scheduledBanner
        ? {
            id: scheduledBanner.id,
            imageUrl: scheduledBanner.imageUrl,
            startsAt: scheduledBanner.startsAt,
            endsAt: scheduledBanner.endsAt,
            noExpiry: scheduledBanner.endsAt === null,
          }
        : null,
      defaultImageUrl: placement?.defaultImageUrl ?? null,
    };
  }

  private findManagedBanner(prisma: BannerPrismaClient, slot: AdSlot) {
    return prisma.directBanner.findFirst({
      where: { slot, isActive: true },
      orderBy: [
        { updatedAt: 'desc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  private parseBooleanFlag(value: unknown, fieldName: string) {
    if (value === undefined || value === null || value === '') {
      return false;
    }

    if (value === true || value === 'true') {
      return true;
    }

    if (value === false || value === 'false') {
      return false;
    }

    throw new BadRequestException(`${fieldName} 값을 확인해 주세요.`);
  }

  private parseOptionalDate(
    body: Record<string, unknown>,
    key: string,
    fieldName: string,
  ) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) {
      return undefined;
    }

    const value = body[key];
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${fieldName}를 입력해 주세요.`);
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} 값을 확인해 주세요.`);
    }

    date.setUTCSeconds(0, 0);
    return date;
  }

  private toImageDataUrl(file: BannerUploadFile) {
    // 업로드 파일은 허용된 이미지 형식과 크기를 검증한 뒤 데이터 URL로만 저장한다.
    if (
      !BANNER_IMAGE_MIME_TYPES.has(file.mimetype) ||
      !file.buffer?.length ||
      file.buffer.length > MAX_BANNER_IMAGE_SIZE ||
      file.size > MAX_BANNER_IMAGE_SIZE ||
      !this.hasValidImageSignature(file.mimetype, file.buffer)
    ) {
      throw new BadRequestException(
        '배너 이미지는 2MB 이하의 JPEG, PNG, WebP, GIF 파일이어야 합니다.',
      );
    }

    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  }

  private parseImageDataUrl(value: string) {
    const match = value.match(
      /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/,
    );
    if (!match) {
      throw new BadRequestException(
        '배너 이미지는 JPEG, PNG, WebP, GIF 파일을 업로드해 주세요.',
      );
    }

    const mimeType = match[1];
    const encodedImage = match[2];
    if (!mimeType || !encodedImage) {
      throw new BadRequestException('배너 이미지 값을 확인해 주세요.');
    }

    const buffer = Buffer.from(encodedImage, 'base64');
    return this.toImageDataUrl({
      buffer,
      mimetype: mimeType,
      originalname: 'legacy-banner',
      size: buffer.length,
    });
  }

  private parseBannerLink(value: string) {
    const linkUrl = value.trim();

    try {
      const parsed = new URL(linkUrl, 'http://localhost');
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('지원하지 않는 프로토콜');
      }
    } catch {
      throw new BadRequestException('배너 링크 주소를 확인해 주세요.');
    }

    return linkUrl;
  }

  private parseLegacyBannerDate(value: string, fieldName: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`배너 ${fieldName} 값을 확인해 주세요.`);
    }

    date.setUTCSeconds(0, 0);
    return date;
  }

  private hasValidImageSignature(mimeType: string, buffer: Buffer) {
    if (mimeType === 'image/jpeg') {
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    }

    if (mimeType === 'image/png') {
      return (
        buffer.length >= 8 &&
        buffer
          .subarray(0, 8)
          .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      );
    }

    if (mimeType === 'image/gif') {
      const signature = buffer.subarray(0, 6).toString('ascii');
      return signature === 'GIF87a' || signature === 'GIF89a';
    }

    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }

  private parseSlot(value: string) {
    const slot = value?.toUpperCase();
    if (!Object.values(AdSlot).includes(slot as AdSlot)) {
      throw new BadRequestException('지원하지 않는 광고 슬롯입니다.');
    }

    return slot as AdSlot;
  }
}
