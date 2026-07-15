// 카카오 장소 검색 결과와 짐슐랭 리뷰 API 응답을 구분해 정의한다.
import type { ApiAuthor } from "@/lib/community-types";

export type GymContentStatus = "ACTIVE" | "BLINDED" | "DELETED";
export type GymSearchSort = "accuracy" | "popular" | "review";

export type GymPlaceLive = {
  providerPlaceId: string;
  name: string;
  categoryName?: string | null;
  addressName?: string | null;
  roadAddressName?: string | null;
  phone?: string | null;
  placeUrl?: string | null;
  longitude: number;
  latitude: number;
  distance?: number | null;
  avgRating: number;
  reviewCount: number;
  reviewTargetToken: string;
};

export type GymSearchResponse = {
  source: "KAKAO";
  notice?: string;
  places: GymPlaceLive[];
};

export type GymReviewComment = {
  id: number;
  content: string;
  status: GymContentStatus;
  isDeleted?: boolean;
  reviewId: number;
  parentId?: number | null;
  author?: ApiAuthor | null;
  createdAt: string;
  updatedAt?: string;
  replies?: GymReviewComment[];
};

export type GymReview = {
  id: number;
  rating: number;
  content: string;
  status: GymContentStatus;
  createdAt: string;
  updatedAt?: string;
  user?: ApiAuthor | null;
  comments?: GymReviewComment[];
};

export type GymReviewSummary = {
  providerPlaceId: string;
  avgRating: number;
  reviewCount: number;
  reviews: GymReview[];
};

export type GymMapPoint = {
  latitude: number;
  longitude: number;
};

export type GymMapViewport = GymMapPoint & {
  rect: string;
};

export type LegalTown = {
  code: string;
  name: string;
};

export type LegalDistrict = {
  code: string;
  name: string;
  towns: LegalTown[];
};

export type LegalRegion = {
  code: string;
  name: string;
  districts: LegalDistrict[];
};

export type LegalRegionData = {
  sourceUrl: string;
  effectiveDate: string;
  generatedAt: string;
  regions: LegalRegion[];
};

export type SelectedLegalRegion = {
  region: LegalRegion;
  district: LegalDistrict;
  town: LegalTown;
  label: string;
};
