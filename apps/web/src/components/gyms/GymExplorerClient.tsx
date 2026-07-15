"use client";

// 현재 위치, 행정구역, 지도 영역과 키워드로 업체를 검색하고 리뷰 패널을 조정한다.
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/api";
import { findKakaoAddress } from "@/lib/kakao-map-loader";
import type {
  GymMapPoint,
  GymMapViewport,
  GymPlaceLive,
  GymSearchResponse,
  GymSearchSort,
  SelectedLegalRegion,
} from "@/lib/gym-types";
import GymPlaceList from "./GymPlaceList";
import GymRegionDialog from "./GymRegionDialog";
import GymReviewPanel from "./GymReviewPanel";
import KakaoGymMap from "./KakaoGymMap";

type CenterRequest = GymMapPoint & {
  requestId: number;
};

type SearchParams = {
  query?: string;
  region?: string;
  x?: number;
  y?: number;
  radius?: number;
  rect?: string;
  sort?: GymSearchSort;
};

const getLocationErrorMessage = (error: GeolocationPositionError) => {
  if (error.code === error.PERMISSION_DENIED) {
    return "위치 권한이 거부되었습니다. 다른 지역을 선택하거나 브라우저 설정에서 권한을 허용해 주세요.";
  }

  if (error.code === error.TIMEOUT) {
    return "현재 위치 확인 시간이 초과되었습니다. 다시 시도해 주세요.";
  }

  return "현재 위치를 확인하지 못했습니다. 다른 지역을 선택해 주세요.";
};

export default function GymExplorerClient() {
  const [query, setQuery] = useState("헬스장");
  const queryRef = useRef(query);
  const [sort, setSort] = useState<GymSearchSort>("accuracy");
  const sortRef = useRef(sort);
  const [places, setPlaces] = useState<GymPlaceLive[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [centerRequest, setCenterRequest] = useState<CenterRequest | null>(null);
  const [currentLocation, setCurrentLocation] = useState<GymMapPoint | null>(null);
  const [viewport, setViewport] = useState<GymMapViewport | null>(null);
  const [selectedRegionLabel, setSelectedRegionLabel] = useState<string | null>(null);
  const [isRegionDialogOpen, setIsRegionDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isViewportDirty, setIsViewportDirty] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const hasSearchedRef = useRef(false);
  const [noticeMessage, setNoticeMessage] = useState("현재 위치를 확인하고 있습니다.");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const centerRequestIdRef = useRef(0);
  const initialLocationRequestedRef = useRef(false);
  const locationIntentIdRef = useRef(0);
  const searchRequestIdRef = useRef(0);
  const viewportRevisionRef = useRef(0);
  const lastSearchParamsRef = useRef<SearchParams | null>(null);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    hasSearchedRef.current = hasSearched;
  }, [hasSearched]);

  const selectedPlace = useMemo(
    () => places.find((place) => place.providerPlaceId === selectedPlaceId) ?? null,
    [places, selectedPlaceId],
  );

  const moveMap = useCallback((point: GymMapPoint) => {
    centerRequestIdRef.current += 1;
    setCenterRequest({ ...point, requestId: centerRequestIdRef.current });
  }, []);

  const searchPlaces = useCallback(async (params: SearchParams) => {
    const requestParams = { ...params, sort: params.sort ?? sortRef.current };
    lastSearchParamsRef.current = requestParams;
    const requestId = ++searchRequestIdRef.current;
    const viewportRevision = viewportRevisionRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.get<GymSearchResponse>("/gyms/search", { params: requestParams });
      if (requestId !== searchRequestIdRef.current) {
        return [];
      }

      setPlaces(response.data.places);
      setSelectedPlaceId((current) =>
        current && response.data.places.some((place) => place.providerPlaceId === current) ? current : null,
      );
      setNoticeMessage(response.data.notice ?? `${response.data.places.length}곳을 찾았습니다.`);
      setHasSearched(true);
      if (viewportRevision === viewportRevisionRef.current) {
        setIsViewportDirty(false);
      }
      return response.data.places;
    } catch {
      if (requestId !== searchRequestIdRef.current) {
        return [];
      }

      setPlaces([]);
      setSelectedPlaceId(null);
      setErrorMessage("헬스장 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      return [];
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const changeSort = (nextSort: GymSearchSort) => {
    if (nextSort === sortRef.current) {
      return;
    }

    setSort(nextSort);
    sortRef.current = nextSort;
    const lastSearchParams = lastSearchParamsRef.current;
    if (!lastSearchParams) {
      return;
    }

    // 지도를 이동한 상태라면 현재 보이는 영역을 기준으로 정렬 검색한다.
    const nextSearchParams: SearchParams = {
      ...lastSearchParams,
      sort: nextSort,
    };
    if (viewport) {
      nextSearchParams.x = viewport.longitude;
      nextSearchParams.y = viewport.latitude;
      nextSearchParams.rect = viewport.rect;
      delete nextSearchParams.radius;
    }

    void searchPlaces(nextSearchParams);
  };

  const requestCurrentLocation = useCallback(() => {
    const locationIntentId = ++locationIntentIdRef.current;
    searchRequestIdRef.current += 1;
    setIsLoading(false);

    if (!("geolocation" in navigator)) {
      setIsLocating(false);
      setNoticeMessage("브라우저가 위치 정보를 지원하지 않습니다. 다른 지역을 선택해 주세요.");
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);
    setNoticeMessage("현재 위치를 확인하고 있습니다.");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (locationIntentId !== locationIntentIdRef.current) {
          return;
        }

        const point = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCurrentLocation(point);
        setSelectedRegionLabel(null);
        moveMap(point);
        setIsLocating(false);
        void searchPlaces({
          query: queryRef.current.trim() || undefined,
          x: point.longitude,
          y: point.latitude,
          radius: 5000,
        });
      },
      (error) => {
        if (locationIntentId !== locationIntentIdRef.current) {
          return;
        }

        setIsLocating(false);
        setNoticeMessage(getLocationErrorMessage(error));
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }, [moveMap, searchPlaces]);

  useEffect(() => {
    if (initialLocationRequestedRef.current) {
      return;
    }

    initialLocationRequestedRef.current = true;
    requestCurrentLocation();
  }, [requestCurrentLocation]);

  const handleKeywordSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    locationIntentIdRef.current += 1;
    setIsLocating(false);
    const keyword = query.trim() || "헬스장";
    setQuery(keyword);

    if (viewport) {
      void searchPlaces({
        query: keyword,
        region: selectedRegionLabel ?? undefined,
        x: viewport.longitude,
        y: viewport.latitude,
        rect: viewport.rect,
      });
      return;
    }

    void searchPlaces({ query: keyword, region: selectedRegionLabel ?? undefined });
  };

  const handleViewportIdle = useCallback((nextViewport: GymMapViewport, userMoved: boolean) => {
    setViewport(nextViewport);
    if (userMoved) {
      locationIntentIdRef.current += 1;
      viewportRevisionRef.current += 1;
      setIsLocating(false);
      if (hasSearchedRef.current) {
        setIsViewportDirty(true);
      }
    }
  }, []);

  const searchCurrentViewport = () => {
    if (!viewport) {
      return;
    }

    locationIntentIdRef.current += 1;
    setIsLocating(false);
    setSelectedRegionLabel(null);
    void searchPlaces({
      query: query.trim() || "헬스장",
      x: viewport.longitude,
      y: viewport.latitude,
      rect: viewport.rect,
    });
  };

  const selectRegion = async (selection: SelectedLegalRegion) => {
    const locationIntentId = ++locationIntentIdRef.current;
    searchRequestIdRef.current += 1;
    setIsLoading(false);
    setIsRegionDialogOpen(false);
    setIsLocating(true);
    setErrorMessage(null);
    setNoticeMessage(`${selection.label} 위치를 찾고 있습니다.`);

    try {
      const point = await findKakaoAddress(selection.label);
      if (locationIntentId !== locationIntentIdRef.current) {
        return;
      }

      setCurrentLocation(null);
      setSelectedRegionLabel(selection.label);
      moveMap(point);
      await searchPlaces({
        query: query.trim() || "헬스장",
        region: selection.label,
        x: point.longitude,
        y: point.latitude,
        radius: 10000,
      });
    } catch (error) {
      if (locationIntentId !== locationIntentIdRef.current) {
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : "선택한 지역을 찾지 못했습니다.");
    } finally {
      if (locationIntentId === locationIntentIdRef.current) {
        setIsLocating(false);
      }
    }
  };

  const selectPlace = useCallback((place: GymPlaceLive) => {
    setSelectedPlaceId(place.providerPlaceId);
    moveMap({ latitude: place.latitude, longitude: place.longitude });
  }, [moveMap]);

  const updateSummary = useCallback((providerPlaceId: string, avgRating: number, reviewCount: number) => {
    setPlaces((current) =>
      current.map((place) =>
        place.providerPlaceId === providerPlaceId ? { ...place, avgRating, reviewCount } : place,
      ),
    );
  }, []);

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-950">헬스장 리뷰</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          내 주변의 헬스장, 짐, PT 업체를 찾고 짐슐랭 회원의 리뷰를 확인해 보세요.
        </p>
      </header>

      <section className="space-y-3" aria-label="헬스장 검색 조건">
        <form onSubmit={handleKeywordSearch} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="gym-keyword" className="sr-only">업체명 또는 운동시설 검색</label>
          <input
            id="gym-keyword"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={80}
            className="input-style min-w-0 flex-1"
            placeholder="헬스장, 짐, PT 또는 업체명"
          />
          <button type="submit" disabled={isLoading} className="button-primary sm:w-28">
            {isLoading ? "검색 중" : "검색"}
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={requestCurrentLocation}
            disabled={isLocating}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-600 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLocating ? "위치 확인 중" : "내 위치"}
          </button>
          <button
            type="button"
            onClick={() => setIsRegionDialogOpen(true)}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-600 hover:text-emerald-700"
          >
            다른 지역 선택
          </button>
          {selectedRegionLabel && (
            <span className="inline-flex items-center rounded bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
              {selectedRegionLabel}
            </span>
          )}
        </div>
      </section>

      <div aria-live="polite" className="min-h-5">
        {errorMessage ? (
          <p role="alert" className="text-sm font-medium text-red-700">{errorMessage}</p>
        ) : (
          <p className="text-sm text-slate-500">{noticeMessage}</p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="relative">
          <KakaoGymMap
            places={places}
            selectedPlaceId={selectedPlaceId}
            centerRequest={centerRequest}
            currentLocation={currentLocation}
            onSelectPlace={selectPlace}
            onViewportIdle={handleViewportIdle}
          />
          {isViewportDirty && viewport && (
            <button
              type="button"
              onClick={searchCurrentViewport}
              disabled={isLoading}
              className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-emerald-700 disabled:bg-slate-400"
            >
              {isLoading ? "검색 중" : "이 지역 재검색"}
            </button>
          )}
        </div>
        <GymPlaceList
          places={places}
          selectedPlaceId={selectedPlaceId}
          isLoading={isLoading}
          sort={sort}
          onSelect={selectPlace}
          onSortChange={changeSort}
        />
      </div>

      {hasSearched && places.length > 0 && !selectedPlace && (
        <p className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          지도 마커나 검색 결과를 선택하면 리뷰를 확인하고 작성할 수 있습니다.
        </p>
      )}

      <GymReviewPanel
        key={selectedPlace?.providerPlaceId ?? "no-place"}
        place={selectedPlace}
        onSummaryChange={updateSummary}
      />

      <GymRegionDialog
        isOpen={isRegionDialogOpen}
        onClose={() => setIsRegionDialogOpen(false)}
        onSelect={(selection) => void selectRegion(selection)}
      />
    </div>
  );
}
