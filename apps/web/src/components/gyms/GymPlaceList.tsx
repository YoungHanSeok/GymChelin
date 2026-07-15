"use client";

// 지도 마커와 같은 검색 결과를 목록으로 제공한다.
import type { GymPlaceLive, GymSearchSort } from "@/lib/gym-types";

const formatDistance = (distance?: number | null) => {
  if (distance === undefined || distance === null) {
    return null;
  }

  return distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`;
};

export default function GymPlaceList({
  places,
  selectedPlaceId,
  isLoading,
  sort,
  onSelect,
  onSortChange,
}: {
  places: GymPlaceLive[];
  selectedPlaceId: string | null;
  isLoading: boolean;
  sort: GymSearchSort;
  onSelect: (place: GymPlaceLive) => void;
  onSortChange: (sort: GymSearchSort) => void;
}) {
  if (isLoading && places.length === 0) {
    return (
      <div role="status" className="flex min-h-48 items-center justify-center rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
        헬스장을 찾는 중입니다.
      </div>
    );
  }

  if (places.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-slate-200 bg-white p-6 text-center text-sm leading-6 text-slate-500">
        내 위치나 다른 지역을 선택해<br />주변 헬스장을 찾아보세요.
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-labelledby="gym-result-title">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 id="gym-result-title" className="text-sm font-bold text-slate-950">검색 결과</h2>
          <label htmlFor="gym-result-sort" className="sr-only">검색 결과 정렬</label>
          <select
            id="gym-result-sort"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as GymSearchSort)}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:outline-none"
          >
            <option value="accuracy">정확도순</option>
            <option value="popular">인기순</option>
            <option value="review">리뷰순</option>
          </select>
        </div>
        <span className="text-xs text-slate-500">{places.length}곳</span>
      </header>
      <div className="max-h-[500px] divide-y divide-slate-100 overflow-y-auto">
        {places.map((place) => {
          const isSelected = place.providerPlaceId === selectedPlaceId;
          const distance = formatDistance(place.distance);

          return (
            <button
              key={place.providerPlaceId}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(place)}
              className={`block w-full px-4 py-4 text-left transition ${
                isSelected ? "bg-emerald-50" : "hover:bg-slate-50"
              }`}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <strong className={`block truncate text-sm ${isSelected ? "text-emerald-800" : "text-slate-950"}`}>
                    {place.name}
                  </strong>
                  <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500">
                    {place.roadAddressName || place.addressName || "주소 정보 없음"}
                  </span>
                </span>
                {distance && <span className="shrink-0 text-xs font-semibold text-slate-500">{distance}</span>}
              </span>
              <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-bold text-amber-600">★ {place.avgRating.toFixed(1)}</span>
                <span>리뷰 {place.reviewCount}</span>
                {place.categoryName && <span className="truncate">{place.categoryName.split(" > ").at(-1)}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
