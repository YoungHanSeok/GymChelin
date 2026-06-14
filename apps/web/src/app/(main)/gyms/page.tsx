"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { sampleGyms, type GymPreview } from "@/lib/mock-data";

type GymSearchResponse = {
  source: string;
  notice?: string;
  places: GymPreview[];
};

export default function GymsPage() {
  const [query, setQuery] = useState("헬스장");
  const [notice, setNotice] = useState("카카오맵 장소 검색을 기반으로 헬스장을 찾습니다.");
  const [gyms, setGyms] = useState<GymPreview[]>(sampleGyms);
  const [isLoading, setIsLoading] = useState(false);

  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.get<GymSearchResponse>("/gyms/search", {
        params: { query },
      });
      setGyms(response.data.places);
      setNotice(response.data.notice ?? `${response.data.source} 검색 결과입니다.`);
    } catch {
      setGyms(sampleGyms);
      setNotice("API 연결이 없어 샘플 헬스장을 표시합니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-950">헬스장 리뷰</h1>
        <p className="mt-2 text-sm text-slate-600">
          카카오맵 장소 목록을 기반으로 헬스장을 찾고, 짐슐랭 회원의 자체 평점과 리뷰를 남깁니다.
        </p>
      </header>

      <form onSubmit={search} className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="input-style"
          placeholder="지역 또는 헬스장명을 입력하세요"
        />
        <button type="submit" disabled={isLoading} className="button-primary md:w-36">
          {isLoading ? "검색 중" : "검색"}
        </button>
      </form>

      <p className="text-sm text-slate-500">{notice}</p>

      <div className="divide-y divide-slate-100 border-b border-slate-200">
        {gyms.map((gym) => (
          <article key={gym.providerPlaceId} className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_140px]">
            <div className="min-w-0">
              <Link href={`/gyms/${encodeURIComponent(gym.providerPlaceId)}`}>
                <h2 className="truncate text-lg font-bold text-slate-950 hover:text-emerald-700">{gym.name}</h2>
              </Link>
              <p className="mt-1 text-sm text-slate-600">{gym.addressName}</p>
              <p className="mt-2 text-xs text-slate-500">
                외부 평점은 공식 API로 제공되는 범위에서만 표기하며, 크롤링하지 않습니다.
              </p>
            </div>
            <div className="flex items-center justify-start md:justify-end">
              <div className="text-left md:text-right">
                <strong className="block text-xl font-black text-slate-950">{gym.avgRating.toFixed(1)}</strong>
                <span className="text-xs text-slate-500">짐슐랭 리뷰 {gym.reviewCount}개</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
