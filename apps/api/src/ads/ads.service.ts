import { BadRequestException, Injectable } from '@nestjs/common';
import { AdSlot } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
        endsAt: { gte: now },
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

    const placement = await this.prisma.adPlacement.findUnique({ where: { slot } });
    const adsenseClient = placement?.adsenseClient ?? process.env.ADSENSE_CLIENT;
    const adsenseSlot = placement?.adsenseSlot ?? process.env[`ADSENSE_SLOT_${slot}`];

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

  listPlacements() {
    return this.prisma.adPlacement.findMany({ orderBy: { slot: 'asc' } });
  }

  upsertPlacement(slotParam: string, body: any) {
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
      orderBy: [{ isActive: 'desc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  createBanner(body: any) {
    const slot = this.parseSlot(body.slot);

    if (!body.title || !body.imageUrl || !body.linkUrl || !body.startsAt || !body.endsAt) {
      throw new BadRequestException('배너 제목, 이미지, 링크, 시작일, 종료일은 필수입니다.');
    }

    return this.prisma.directBanner.create({
      data: {
        slot,
        title: body.title,
        imageUrl: body.imageUrl,
        linkUrl: body.linkUrl,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        priority: Number(body.priority ?? 0),
        isActive: body.isActive ?? true,
      },
    });
  }

  private parseSlot(value: string) {
    const slot = value?.toUpperCase();
    if (!Object.values(AdSlot).includes(slot as AdSlot)) {
      throw new BadRequestException('지원하지 않는 광고 슬롯입니다.');
    }

    return slot as AdSlot;
  }
}
