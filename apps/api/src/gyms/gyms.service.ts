// 헬스장 정보와 사용자 리뷰의 조회 및 저장을 처리한다.
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthProvider, ContentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type KakaoPlace = {
  id: string;
  place_name: string;
  category_name?: string;
  address_name?: string;
  road_address_name?: string;
  phone?: string;
  place_url?: string;
  x?: string;
  y?: string;
  distance?: string;
};

@Injectable()
export class GymsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: {
    query?: string;
    x?: string;
    y?: string;
    radius?: string;
  }) {
    const keyword = query.query?.trim() || '헬스장';
    const kakaoKey = process.env.KAKAO_REST_API_KEY;

    if (!kakaoKey) {
      const saved = await this.prisma.gymPlace.findMany({
        where: {
          OR: [
            { name: { contains: keyword, mode: 'insensitive' } },
            { categoryName: { contains: keyword, mode: 'insensitive' } },
            { addressName: { contains: keyword, mode: 'insensitive' } },
            { roadAddressName: { contains: keyword, mode: 'insensitive' } },
          ],
        },
        orderBy: [{ reviewCount: 'desc' }, { updatedAt: 'desc' }],
        take: 15,
      });

      return {
        source: 'LOCAL_CACHE',
        places: saved,
        notice:
          saved.length > 0
            ? 'KAKAO_REST_API_KEY가 없어 저장된 헬스장만 표시합니다.'
            : 'KAKAO_REST_API_KEY가 없고 저장된 헬스장이 없습니다.',
      };
    }

    const params = new URLSearchParams({
      query: keyword,
      size: '15',
    });

    if (query.x && query.y) {
      params.set('x', query.x);
      params.set('y', query.y);
      params.set('radius', query.radius ?? '20000');
    }

    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
      {
        headers: { Authorization: `KakaoAK ${kakaoKey}` },
      },
    );

    if (!response.ok) {
      throw new BadRequestException('카카오 장소 검색에 실패했습니다.');
    }

    const data = (await response.json()) as { documents?: KakaoPlace[] };
    const gymLikePlaces = (data.documents ?? []).filter((place) =>
      `${place.place_name} ${place.category_name ?? ''}`.includes('헬스'),
    );
    const places = await Promise.all(
      gymLikePlaces.map((place) => this.upsertKakaoPlace(place)),
    );

    return {
      source: 'KAKAO',
      places,
      notice: '외부 평점은 공식 API로 제공되는 범위에서만 표시합니다.',
    };
  }

  async findOne(providerPlaceId: string) {
    const gym = await this.prisma.gymPlace.findUnique({
      where: { providerPlaceId },
      include: {
        reviews: {
          where: { status: ContentStatus.ACTIVE },
          include: {
            user: { select: { id: true, nickname: true, username: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!gym) {
      throw new NotFoundException(
        '헬스장을 찾을 수 없습니다. 먼저 헬스장 검색을 실행해 주세요.',
      );
    }

    return gym;
  }

  async createReview(
    providerPlaceId: string,
    input: {
      rating: number;
      content: string;
      userId: number;
      place?: KakaoPlace;
    },
  ) {
    const rating = Number(input.rating);
    const content = input.content?.trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException(
        '평점은 1점부터 5점까지 입력할 수 있습니다.',
      );
    }

    if (!content) {
      throw new BadRequestException('리뷰 내용을 입력해 주세요.');
    }

    let gym = await this.prisma.gymPlace.findUnique({
      where: { providerPlaceId },
    });

    if (!gym && input.place) {
      gym = await this.upsertKakaoPlace({
        ...input.place,
        id: providerPlaceId,
      });
    }

    if (!gym) {
      throw new NotFoundException('헬스장을 찾을 수 없습니다.');
    }

    await this.prisma.gymReview.upsert({
      where: { gymId_userId: { gymId: gym.id, userId: input.userId } },
      create: {
        gymId: gym.id,
        userId: input.userId,
        rating,
        content,
      },
      update: {
        rating,
        content,
        status: ContentStatus.ACTIVE,
      },
    });

    return this.recalculateRating(gym.id);
  }

  private async recalculateRating(gymId: number) {
    const aggregate = await this.prisma.gymReview.aggregate({
      where: { gymId, status: ContentStatus.ACTIVE },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.gymPlace.update({
      where: { id: gymId },
      data: {
        avgRating: Number((aggregate._avg.rating ?? 0).toFixed(2)),
        reviewCount: aggregate._count.rating,
      },
    });

    return this.prisma.gymPlace.findUnique({
      where: { id: gymId },
      include: {
        reviews: {
          where: { status: ContentStatus.ACTIVE },
          include: {
            user: { select: { id: true, nickname: true, username: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  private upsertKakaoPlace(place: KakaoPlace) {
    return this.prisma.gymPlace.upsert({
      where: { providerPlaceId: String(place.id) },
      create: {
        provider: AuthProvider.KAKAO,
        providerPlaceId: String(place.id),
        name: place.place_name,
        categoryName: place.category_name,
        addressName: place.address_name,
        roadAddressName: place.road_address_name,
        phone: place.phone,
        placeUrl: place.place_url,
        longitude: place.x ? Number(place.x) : null,
        latitude: place.y ? Number(place.y) : null,
        externalRating: null,
        externalRatingSource: null,
      },
      update: {
        name: place.place_name,
        categoryName: place.category_name,
        addressName: place.address_name,
        roadAddressName: place.road_address_name,
        phone: place.phone,
        placeUrl: place.place_url,
        longitude: place.x ? Number(place.x) : null,
        latitude: place.y ? Number(place.y) : null,
      },
    });
  }
}
