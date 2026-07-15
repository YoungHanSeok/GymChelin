// 카카오 장소는 실시간으로만 조회하고 자체 리뷰 데이터만 저장한다.
import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthProvider, ContentStatus, Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { isAdminRole } from '../auth/admin-role';
import { PrismaService } from '../prisma/prisma.service';

type KakaoPlace = {
  id?: unknown;
  place_name?: unknown;
  category_name?: unknown;
  address_name?: unknown;
  road_address_name?: unknown;
  phone?: unknown;
  place_url?: unknown;
  x?: unknown;
  y?: unknown;
  distance?: unknown;
};

type KakaoSearchResponse = {
  documents?: unknown;
};

type GymSearchInput = {
  query?: unknown;
  region?: unknown;
  x?: unknown;
  y?: unknown;
  radius?: unknown;
  rect?: unknown;
  sort?: unknown;
};

type GymSearchSort = 'accuracy' | 'popular' | 'review';

type ParsedSearchInput = {
  query: string;
  region: string;
  x?: number;
  y?: number;
  radius?: number;
  rect?: string;
  sort: GymSearchSort;
};

type NormalizedKakaoPlace = {
  providerPlaceId: string;
  name: string;
  categoryName?: string;
  addressName?: string;
  roadAddressName?: string;
  phone?: string;
  placeUrl?: string;
  longitude: number;
  latitude: number;
  distance?: number;
};

type GymSearchPlace = NormalizedKakaoPlace & {
  avgRating: number;
  reviewCount: number;
  reviewTargetToken: string;
};

type KakaoSearchCacheEntry = {
  expiresAt: number;
  places: NormalizedKakaoPlace[];
};

type KakaoSearchRateWindow = {
  count: number;
  startedAt: number;
};

type ReviewTargetTokenPayload = {
  version: 1;
  provider: 'KAKAO';
  providerPlaceId: string;
  expiresAt: number;
};

const REVIEW_AUTHOR_SELECT = {
  id: true,
  nickname: true,
  username: true,
} as const;

const REVIEW_COMMENT_INCLUDE = {
  author: { select: REVIEW_AUTHOR_SELECT },
} satisfies Prisma.GymReviewCommentInclude;

const GYM_REVIEW_INCLUDE = {
  user: { select: REVIEW_AUTHOR_SELECT },
  comments: {
    where: {
      status: { in: [ContentStatus.ACTIVE, ContentStatus.DELETED] },
    },
    include: REVIEW_COMMENT_INCLUDE,
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.GymReviewInclude;

const GYM_PLACE_REVIEW_INCLUDE = {
  reviews: {
    where: { status: ContentStatus.ACTIVE },
    include: GYM_REVIEW_INCLUDE,
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.GymPlaceInclude;

type GymPlaceReviewEntity = Prisma.GymPlaceGetPayload<{
  include: typeof GYM_PLACE_REVIEW_INCLUDE;
}>;

type GymReviewCommentEntity = Prisma.GymReviewCommentGetPayload<{
  include: typeof REVIEW_COMMENT_INCLUDE;
}>;

export type GymReviewCommentView = {
  id: number;
  content: string;
  status: ContentStatus;
  isDeleted: boolean;
  reviewId: number;
  parentId: number | null;
  author: GymReviewCommentEntity['author'] | null;
  createdAt: Date;
  updatedAt: Date;
  replies: GymReviewCommentView[];
};

const DEFAULT_RADIUS_METERS = 5000;
const MAX_RADIUS_METERS = 20000;
const MAX_REVIEW_LENGTH = 3000;
const MAX_COMMENT_LENGTH = 2000;
const REVIEW_TARGET_TOKEN_TTL_SECONDS = 60 * 60 * 2;
const KAKAO_SEARCH_CACHE_TTL_MS = 30_000;
const KAKAO_SEARCH_CACHE_MAX_ENTRIES = 200;
const KAKAO_SEARCH_RATE_WINDOW_MS = 60_000;
const KAKAO_SEARCH_RATE_MAX_REQUESTS = 12;
const KAKAO_SEARCH_RATE_MAX_CLIENTS = 5000;
const GYM_SEARCH_SORT_VALUES: GymSearchSort[] = [
  'accuracy',
  'popular',
  'review',
];
const KOREAN_NAME_COLLATOR = new Intl.Collator('ko-KR');
const GYM_KEYWORDS = ['헬스장', '피트니스', '휘트니스', 'PT', '짐', '크로스핏'];
const GENERIC_GYM_KEYWORDS = new Set([
  '헬스',
  '헬스장',
  '피트니스',
  '휘트니스',
  'pt',
  '짐',
  'gym',
  '크로스핏',
]);
const GYM_LIKE_PATTERN =
  /(헬스|피트니스|휘트니스|퍼스널\s*트레이닝|크로스핏|(?:^|\s)pt(?:\s|$)|gym|짐)/i;

@Injectable()
export class GymsService {
  private readonly kakaoSearchCache = new Map<string, KakaoSearchCacheEntry>();
  private readonly pendingKakaoSearches = new Map<
    string,
    Promise<NormalizedKakaoPlace[]>
  >();
  private readonly kakaoSearchRateWindows = new Map<
    string,
    KakaoSearchRateWindow
  >();

  constructor(private readonly prisma: PrismaService) {}

  async search(input: GymSearchInput, clientAddress = 'unknown') {
    const query = this.parseSearchInput(input);
    const places = await this.findKakaoPlaces(query, clientAddress);

    const summaries = await this.findReviewSummaries(
      places.map((place) => place.providerPlaceId),
    );

    const searchPlaces = places.map((place) => {
      const summary = summaries.get(place.providerPlaceId);

      return {
        ...place,
        avgRating: summary?.avgRating ?? 0,
        reviewCount: summary?.reviewCount ?? 0,
        reviewTargetToken: this.createReviewTargetToken(place.providerPlaceId),
      };
    });

    return {
      source: 'KAKAO',
      notice:
        '카카오 장소 정보는 실시간으로 조회하며, 짐슐랭 자체 평점과 리뷰만 저장합니다.',
      places: this.sortSearchPlaces(searchPlaces, query.sort),
    };
  }

  async findReviews(providerPlaceId: string) {
    const gym = await this.prisma.gymPlace.findFirst({
      where: { provider: AuthProvider.KAKAO, providerPlaceId },
      include: GYM_PLACE_REVIEW_INCLUDE,
    });

    return this.toReviewSummary(providerPlaceId, gym);
  }

  async createReview(
    providerPlaceId: string,
    input: {
      rating: unknown;
      content: unknown;
      reviewTargetToken: unknown;
      userId: number;
    },
  ) {
    const rating = this.parseRating(input.rating);
    const content = this.parseContent(
      input.content,
      '리뷰 내용을 입력해 주세요.',
      MAX_REVIEW_LENGTH,
      '리뷰',
    );
    this.verifyReviewTargetToken(providerPlaceId, input.reviewTargetToken);

    await this.prisma.$transaction(async (tx) => {
      // 검색 시에는 만들지 않고 사용자가 리뷰를 남길 때 장소 ID만 등록한다.
      const gym = await tx.gymPlace.upsert({
        where: { providerPlaceId },
        create: {
          provider: AuthProvider.KAKAO,
          providerPlaceId,
        },
        update: { provider: AuthProvider.KAKAO },
      });
      const existing = await tx.gymReview.findUnique({
        where: { gymId_userId: { gymId: gym.id, userId: input.userId } },
        select: { status: true },
      });

      if (existing?.status === ContentStatus.BLINDED) {
        throw new ForbiddenException(
          '블라인드 처리된 리뷰는 다시 작성할 수 없습니다.',
        );
      }

      if (existing?.status === ContentStatus.DELETED) {
        throw new BadRequestException('삭제된 리뷰는 다시 작성할 수 없습니다.');
      }

      await tx.gymReview.upsert({
        where: { gymId_userId: { gymId: gym.id, userId: input.userId } },
        create: {
          gymId: gym.id,
          userId: input.userId,
          rating,
          content,
        },
        update: { rating, content },
      });
      await this.recalculateRating(tx, gym.id);
    });

    return this.findReviews(providerPlaceId);
  }

  async createReviewComment(
    reviewId: number,
    input: { content: unknown; parentId?: unknown; authorId: number },
  ) {
    const content = this.parseContent(
      input.content,
      '댓글 내용을 입력해 주세요.',
      MAX_COMMENT_LENGTH,
      '댓글',
    );
    const review = await this.prisma.gymReview.findFirst({
      where: { id: reviewId, status: ContentStatus.ACTIVE },
      select: { id: true },
    });

    if (!review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    const parentId = this.parseOptionalId(input.parentId, '부모 댓글');
    if (parentId) {
      const parent = await this.prisma.gymReviewComment.findFirst({
        where: {
          id: parentId,
          reviewId,
          status: ContentStatus.ACTIVE,
        },
        select: { id: true },
      });

      if (!parent) {
        throw new NotFoundException('부모 댓글을 찾을 수 없습니다.');
      }
    }

    const comment = await this.prisma.gymReviewComment.create({
      data: {
        reviewId,
        authorId: input.authorId,
        parentId,
        content,
      },
      include: REVIEW_COMMENT_INCLUDE,
    });

    return this.toCommentView(comment);
  }

  async deleteReviewComment(input: {
    reviewId: number;
    commentId: number;
    userId: number;
    userRole?: string;
  }) {
    const comment = await this.prisma.gymReviewComment.findFirst({
      where: { id: input.commentId, reviewId: input.reviewId },
      select: { id: true, authorId: true, status: true },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    if (comment.status === ContentStatus.DELETED) {
      return { ok: true };
    }

    if (comment.authorId !== input.userId && !isAdminRole(input.userRole)) {
      throw new ForbiddenException('댓글을 삭제할 권한이 없습니다.');
    }

    await this.prisma.gymReviewComment.update({
      where: { id: input.commentId },
      data: { status: ContentStatus.DELETED },
    });

    return { ok: true };
  }

  private async fetchKakaoPlaces(
    kakaoKey: string,
    keyword: string,
    input: ParsedSearchInput,
  ) {
    const params = new URLSearchParams({ query: keyword, size: '15' });

    if (input.x !== undefined && input.y !== undefined) {
      params.set('x', String(input.x));
      params.set('y', String(input.y));

      if (!input.rect) {
        params.set('radius', String(input.radius ?? DEFAULT_RADIUS_METERS));
      }
    }

    if (input.rect) {
      params.set('rect', input.rect);
    }

    let response: Response;
    try {
      response = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
        {
          headers: { Authorization: `KakaoAK ${kakaoKey}` },
          signal: AbortSignal.timeout(5000),
        },
      );
    } catch {
      throw new BadGatewayException(
        '카카오 장소 검색 서버에 연결할 수 없습니다.',
      );
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new ServiceUnavailableException(
          '카카오 장소 검색 인증 설정을 확인해 주세요.',
        );
      }

      if (response.status === 429) {
        throw new BadGatewayException(
          '카카오 장소 검색 요청 한도를 초과했습니다.',
        );
      }

      throw new BadGatewayException('카카오 장소 검색에 실패했습니다.');
    }

    let data: KakaoSearchResponse;
    try {
      data = (await response.json()) as KakaoSearchResponse;
    } catch {
      throw new BadGatewayException(
        '카카오 장소 검색 응답이 올바르지 않습니다.',
      );
    }

    if (!Array.isArray(data.documents)) {
      throw new BadGatewayException(
        '카카오 장소 검색 응답이 올바르지 않습니다.',
      );
    }

    return data.documents as KakaoPlace[];
  }

  private async findKakaoPlaces(
    input: ParsedSearchInput,
    clientAddress: string,
  ) {
    // 장소 원본은 짧게 메모리에만 유지하고 동일 요청은 하나의 카카오 호출로 합친다.
    const cacheKey = this.createKakaoSearchCacheKey(input);
    const now = Date.now();
    const cached = this.kakaoSearchCache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      return cached.places;
    }
    if (cached) {
      this.kakaoSearchCache.delete(cacheKey);
    }

    const pending = this.pendingKakaoSearches.get(cacheKey);
    if (pending) {
      return pending;
    }

    this.assertKakaoSearchRateLimit(clientAddress, now);
    const searchPromise = this.searchKakaoPlaces(input)
      .then((places) => {
        this.storeKakaoSearchCache(cacheKey, places);
        return places;
      })
      .finally(() => {
        this.pendingKakaoSearches.delete(cacheKey);
      });

    this.pendingKakaoSearches.set(cacheKey, searchPromise);
    return searchPromise;
  }

  private async searchKakaoPlaces(input: ParsedSearchInput) {
    const kakaoKey = this.getKakaoKey();
    const keywords = this.buildSearchKeywords(input.query, input.region);
    const searchResults = await Promise.all(
      keywords.map((keyword) =>
        this.fetchKakaoPlaces(kakaoKey, keyword, input),
      ),
    );
    const placeMap = new Map<string, NormalizedKakaoPlace>();

    searchResults.flat().forEach((rawPlace) => {
      const place = this.normalizeKakaoPlace(rawPlace);
      if (!place || !this.isGymLikePlace(place)) {
        return;
      }

      const previous = placeMap.get(place.providerPlaceId);
      if (
        !previous ||
        (place.distance !== undefined &&
          (previous.distance === undefined ||
            place.distance < previous.distance))
      ) {
        placeMap.set(place.providerPlaceId, place);
      }
    });

    return [...placeMap.values()];
  }

  private createKakaoSearchCacheKey(input: ParsedSearchInput) {
    // 정렬만 바뀐 요청은 같은 카카오 원본을 공유하고 자체 평점 조회 후 따로 정렬한다.
    return JSON.stringify({
      query: input.query,
      region: input.region,
      x: input.x,
      y: input.y,
      radius: input.radius,
      rect: input.rect,
    });
  }

  private storeKakaoSearchCache(
    cacheKey: string,
    places: NormalizedKakaoPlace[],
  ) {
    const now = Date.now();
    this.kakaoSearchCache.forEach((entry, key) => {
      if (entry.expiresAt <= now) {
        this.kakaoSearchCache.delete(key);
      }
    });

    if (
      !this.kakaoSearchCache.has(cacheKey) &&
      this.kakaoSearchCache.size >= KAKAO_SEARCH_CACHE_MAX_ENTRIES
    ) {
      const oldestKey = this.kakaoSearchCache.keys().next().value as
        | string
        | undefined;
      if (oldestKey) {
        this.kakaoSearchCache.delete(oldestKey);
      }
    }

    this.kakaoSearchCache.set(cacheKey, {
      expiresAt: now + KAKAO_SEARCH_CACHE_TTL_MS,
      places,
    });
  }

  private assertKakaoSearchRateLimit(clientAddress: string, now: number) {
    // 캐시가 없는 외부 검색만 클라이언트별로 제한해 카카오 쿼터를 보호한다.
    const key = clientAddress.trim().slice(0, 128) || 'unknown';
    const current = this.kakaoSearchRateWindows.get(key);

    if (!current || now - current.startedAt >= KAKAO_SEARCH_RATE_WINDOW_MS) {
      this.pruneKakaoSearchRateWindows(now);
      this.kakaoSearchRateWindows.set(key, { count: 1, startedAt: now });
      return;
    }

    if (current.count >= KAKAO_SEARCH_RATE_MAX_REQUESTS) {
      throw new HttpException(
        '헬스장 검색 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
  }

  private pruneKakaoSearchRateWindows(now: number) {
    this.kakaoSearchRateWindows.forEach((window, key) => {
      if (now - window.startedAt >= KAKAO_SEARCH_RATE_WINDOW_MS) {
        this.kakaoSearchRateWindows.delete(key);
      }
    });

    if (this.kakaoSearchRateWindows.size >= KAKAO_SEARCH_RATE_MAX_CLIENTS) {
      const oldestKey = this.kakaoSearchRateWindows.keys().next().value as
        | string
        | undefined;
      if (oldestKey) {
        this.kakaoSearchRateWindows.delete(oldestKey);
      }
    }
  }

  private parseSearchInput(input: GymSearchInput): ParsedSearchInput {
    const query = this.parseOptionalText(input.query, '검색어', 100);
    const region = this.parseOptionalText(input.region, '지역명', 100);
    const sort = this.parseSearchSort(input.sort);
    const x = this.parseOptionalNumber(input.x, '경도');
    const y = this.parseOptionalNumber(input.y, '위도');

    if ((x === undefined) !== (y === undefined)) {
      throw new BadRequestException('경도와 위도를 함께 입력해 주세요.');
    }

    if (x !== undefined && (x < -180 || x > 180)) {
      throw new BadRequestException('경도는 -180부터 180 사이여야 합니다.');
    }

    if (y !== undefined && (y < -90 || y > 90)) {
      throw new BadRequestException('위도는 -90부터 90 사이여야 합니다.');
    }

    const radiusValue = this.parseOptionalNumber(input.radius, '검색 반경');
    if (radiusValue !== undefined && x === undefined) {
      throw new BadRequestException(
        '검색 반경을 사용할 때는 경도와 위도가 필요합니다.',
      );
    }

    if (
      radiusValue !== undefined &&
      (!Number.isInteger(radiusValue) ||
        radiusValue < 1 ||
        radiusValue > MAX_RADIUS_METERS)
    ) {
      throw new BadRequestException(
        `검색 반경은 1m부터 ${MAX_RADIUS_METERS.toLocaleString('ko-KR')}m까지 입력할 수 있습니다.`,
      );
    }

    const rect = this.parseRect(input.rect);
    if (rect && radiusValue !== undefined) {
      throw new BadRequestException(
        '지도 영역과 검색 반경은 동시에 입력할 수 없습니다.',
      );
    }

    return {
      query,
      region,
      x,
      y,
      radius:
        radiusValue ?? (x === undefined ? undefined : DEFAULT_RADIUS_METERS),
      rect,
      sort,
    };
  }

  private parseSearchSort(value: unknown): GymSearchSort {
    if (value === undefined || value === null || value === '') {
      return 'accuracy';
    }

    if (
      typeof value !== 'string' ||
      !GYM_SEARCH_SORT_VALUES.includes(value as GymSearchSort)
    ) {
      throw new BadRequestException(
        '정렬은 accuracy, popular, review 중 하나만 사용할 수 있습니다.',
      );
    }

    return value as GymSearchSort;
  }

  private parseRect(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('지도 영역 형식이 올바르지 않습니다.');
    }

    const coordinates = value.split(',').map((item) => Number(item.trim()));
    if (
      coordinates.length !== 4 ||
      coordinates.some((coordinate) => !Number.isFinite(coordinate))
    ) {
      throw new BadRequestException(
        '지도 영역은 서쪽경도,남쪽위도,동쪽경도,북쪽위도 순서로 입력해 주세요.',
      );
    }

    const [west, south, east, north] = coordinates;
    if (
      west < -180 ||
      west > 180 ||
      east < -180 ||
      east > 180 ||
      south < -90 ||
      south > 90 ||
      north < -90 ||
      north > 90 ||
      west >= east ||
      south >= north
    ) {
      throw new BadRequestException('지도 영역 좌표 범위가 올바르지 않습니다.');
    }

    return coordinates.join(',');
  }

  private parseOptionalText(value: unknown, label: string, maxLength: number) {
    if (value === undefined || value === null) {
      return '';
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${label} 형식이 올바르지 않습니다.`);
    }

    const text = value.trim();
    if (text.length > maxLength) {
      throw new BadRequestException(
        `${label}는 ${maxLength.toLocaleString('ko-KR')}자 이내로 입력해 주세요.`,
      );
    }

    const hasControlCharacter = [...text].some((character) => {
      const characterCode = character.charCodeAt(0);
      return characterCode <= 31 || characterCode === 127;
    });
    if (hasControlCharacter) {
      throw new BadRequestException(
        `${label}에 제어 문자를 입력할 수 없습니다.`,
      );
    }

    return text;
  }

  private parseOptionalNumber(value: unknown, label: string) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (
      (typeof value !== 'string' && typeof value !== 'number') ||
      !Number.isFinite(Number(value))
    ) {
      throw new BadRequestException(`${label} 형식이 올바르지 않습니다.`);
    }

    return Number(value);
  }

  private buildSearchKeywords(query: string, region: string) {
    const normalizedQuery = query.toLocaleLowerCase('ko-KR');
    let terms: string[];

    if (!query || GENERIC_GYM_KEYWORDS.has(normalizedQuery)) {
      terms = GYM_KEYWORDS;
    } else {
      terms = [query, `${query} 헬스장`, `${query} PT`];
    }

    return [
      ...new Set(terms.map((term) => [region, term].filter(Boolean).join(' '))),
    ];
  }

  private normalizeKakaoPlace(
    rawPlace: KakaoPlace,
  ): NormalizedKakaoPlace | null {
    const providerPlaceId = this.toOptionalString(rawPlace.id);
    const name = this.toOptionalString(rawPlace.place_name)?.trim();
    const longitude = Number(rawPlace.x);
    const latitude = Number(rawPlace.y);

    if (
      !providerPlaceId ||
      !/^[1-9]\d{0,30}$/.test(providerPlaceId) ||
      !name ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      return null;
    }

    const distanceValue = Number(rawPlace.distance);
    return {
      providerPlaceId,
      name,
      categoryName: this.toOptionalString(rawPlace.category_name),
      addressName: this.toOptionalString(rawPlace.address_name),
      roadAddressName: this.toOptionalString(rawPlace.road_address_name),
      phone: this.toOptionalString(rawPlace.phone),
      placeUrl: this.toOptionalString(rawPlace.place_url),
      longitude,
      latitude,
      distance:
        Number.isFinite(distanceValue) && distanceValue >= 0
          ? distanceValue
          : undefined,
    };
  }

  private isGymLikePlace(place: NormalizedKakaoPlace) {
    return GYM_LIKE_PATTERN.test(`${place.name} ${place.categoryName ?? ''}`);
  }

  private toOptionalString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private async findReviewSummaries(providerPlaceIds: string[]) {
    if (providerPlaceIds.length === 0) {
      return new Map<string, { avgRating: number; reviewCount: number }>();
    }

    const gyms = await this.prisma.gymPlace.findMany({
      where: {
        provider: AuthProvider.KAKAO,
        providerPlaceId: { in: providerPlaceIds },
      },
      select: {
        providerPlaceId: true,
        avgRating: true,
        reviewCount: true,
      },
    });

    return new Map(
      gyms.map((gym) => [
        gym.providerPlaceId,
        { avgRating: gym.avgRating, reviewCount: gym.reviewCount },
      ]),
    );
  }

  private sortSearchPlaces(places: GymSearchPlace[], sort: GymSearchSort) {
    if (sort === 'accuracy') {
      return places;
    }

    return [...places].sort((left, right) => {
      const primaryDifference =
        sort === 'popular'
          ? right.avgRating - left.avgRating
          : right.reviewCount - left.reviewCount;
      if (primaryDifference !== 0) {
        return primaryDifference;
      }

      const secondaryDifference =
        sort === 'popular'
          ? right.reviewCount - left.reviewCount
          : right.avgRating - left.avgRating;
      if (secondaryDifference !== 0) {
        return secondaryDifference;
      }

      const leftDistance = left.distance ?? Number.POSITIVE_INFINITY;
      const rightDistance = right.distance ?? Number.POSITIVE_INFINITY;
      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      const nameDifference = KOREAN_NAME_COLLATOR.compare(
        left.name,
        right.name,
      );
      if (nameDifference !== 0) {
        return nameDifference;
      }

      return left.providerPlaceId.localeCompare(right.providerPlaceId);
    });
  }

  private toReviewSummary(
    providerPlaceId: string,
    gym: GymPlaceReviewEntity | null,
  ) {
    return {
      providerPlaceId,
      avgRating: gym?.avgRating ?? 0,
      reviewCount: gym?.reviewCount ?? 0,
      reviews: (gym?.reviews ?? []).map((review) => ({
        id: review.id,
        rating: review.rating,
        content: review.content,
        status: review.status,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        user: review.user,
        comments: this.buildCommentTree(review.comments),
      })),
    };
  }

  private buildCommentTree(comments: GymReviewCommentEntity[]) {
    // ID 맵으로 부모 댓글을 한 번만 찾아 답글 계층을 구성한다.
    const commentMap = new Map<number, GymReviewCommentView>();
    const roots: GymReviewCommentView[] = [];

    comments.forEach((comment) => {
      commentMap.set(comment.id, this.toCommentView(comment));
    });

    commentMap.forEach((comment) => {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(comment);
          return;
        }
      }

      roots.push(comment);
    });

    return roots;
  }

  private toCommentView(comment: GymReviewCommentEntity): GymReviewCommentView {
    const isDeleted = comment.status === ContentStatus.DELETED;

    return {
      id: comment.id,
      content: isDeleted ? '삭제된 댓글입니다.' : comment.content,
      status: comment.status,
      isDeleted,
      reviewId: comment.reviewId,
      parentId: comment.parentId,
      author: isDeleted ? null : comment.author,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      replies: [],
    };
  }

  private parseRating(value: unknown) {
    if (
      (typeof value !== 'string' && typeof value !== 'number') ||
      (typeof value === 'string' && !value.trim())
    ) {
      throw new BadRequestException(
        '평점은 1점부터 5점까지 입력할 수 있습니다.',
      );
    }

    const rating = Number(value);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException(
        '평점은 1점부터 5점까지 입력할 수 있습니다.',
      );
    }

    return rating;
  }

  private parseContent(
    value: unknown,
    requiredMessage: string,
    maxLength: number,
    label: string,
  ) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(requiredMessage);
    }

    const content = value.trim();
    if (content.includes('\u0000')) {
      throw new BadRequestException(
        `${label}에 허용되지 않는 제어 문자를 입력할 수 없습니다.`,
      );
    }

    if (content.length > maxLength) {
      throw new BadRequestException(
        `${label}은 ${maxLength.toLocaleString('ko-KR')}자 이내로 입력해 주세요.`,
      );
    }

    return content;
  }

  private parseOptionalId(value: unknown, label: string) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new BadRequestException(`올바른 ${label} ID를 입력해 주세요.`);
    }

    const id = Number(value);
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException(`올바른 ${label} ID를 입력해 주세요.`);
    }

    return id;
  }

  private async recalculateRating(tx: Prisma.TransactionClient, gymId: number) {
    const aggregate = await tx.gymReview.aggregate({
      where: { gymId, status: ContentStatus.ACTIVE },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.gymPlace.update({
      where: { id: gymId },
      data: {
        avgRating: Number((aggregate._avg.rating ?? 0).toFixed(2)),
        reviewCount: aggregate._count.rating,
      },
    });
  }

  private createReviewTargetToken(providerPlaceId: string) {
    const payload: ReviewTargetTokenPayload = {
      version: 1,
      provider: 'KAKAO',
      providerPlaceId,
      expiresAt:
        Math.floor(Date.now() / 1000) + REVIEW_TARGET_TOKEN_TTL_SECONDS,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const signature = this.signReviewTarget(encodedPayload);

    return `${encodedPayload}.${signature}`;
  }

  private verifyReviewTargetToken(
    providerPlaceId: string,
    tokenValue: unknown,
  ) {
    if (typeof tokenValue !== 'string' || tokenValue.length > 1000) {
      throw new BadRequestException('리뷰 대상 확인 정보가 올바르지 않습니다.');
    }

    const tokenParts = tokenValue.split('.');
    if (tokenParts.length !== 2 || !tokenParts[0] || !tokenParts[1]) {
      throw new BadRequestException('리뷰 대상 확인 정보가 올바르지 않습니다.');
    }

    const [encodedPayload, encodedSignature] = tokenParts;
    const expectedSignature = Buffer.from(
      this.signReviewTarget(encodedPayload),
      'base64url',
    );
    let receivedSignature: Buffer;
    try {
      receivedSignature = Buffer.from(encodedSignature, 'base64url');
    } catch {
      throw new BadRequestException('리뷰 대상 확인 정보가 올바르지 않습니다.');
    }

    if (
      expectedSignature.length !== receivedSignature.length ||
      !timingSafeEqual(expectedSignature, receivedSignature)
    ) {
      throw new BadRequestException('리뷰 대상 확인 정보가 올바르지 않습니다.');
    }

    let payload: ReviewTargetTokenPayload;
    try {
      payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as ReviewTargetTokenPayload;
    } catch {
      throw new BadRequestException('리뷰 대상 확인 정보가 올바르지 않습니다.');
    }

    if (
      typeof payload !== 'object' ||
      payload === null ||
      payload.version !== 1 ||
      payload.provider !== 'KAKAO' ||
      payload.providerPlaceId !== providerPlaceId ||
      !Number.isSafeInteger(payload.expiresAt) ||
      payload.expiresAt < Math.floor(Date.now() / 1000)
    ) {
      throw new BadRequestException(
        '리뷰 대상 확인 정보가 만료되었거나 올바르지 않습니다.',
      );
    }
  }

  private signReviewTarget(encodedPayload: string) {
    return createHmac(
      'sha256',
      process.env.AUTH_SECRET ?? 'gymchelin-dev-secret',
    )
      .update(`gym-review-target:${encodedPayload}`)
      .digest('base64url');
  }

  private getKakaoKey() {
    const kakaoKey = process.env.KAKAO_REST_API_KEY?.trim();
    if (!kakaoKey) {
      throw new ServiceUnavailableException(
        '카카오 장소 검색 환경변수가 설정되지 않았습니다.',
      );
    }

    return kakaoKey;
  }
}
