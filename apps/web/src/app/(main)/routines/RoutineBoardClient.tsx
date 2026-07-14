"use client";

import { isAxiosError } from "axios";
import Link from "next/link";
import { useState } from "react";
import AdSlot from "@/components/ads/AdSlot";
import CommunityContentToolbar, {
  type CommunitySortOption,
} from "@/components/community/CommunityContentToolbar";
import api from "@/lib/api";
import {
  authorName,
  formatRelativeDateLabel,
  toPlainTextPreview,
} from "@/lib/community-types";
import {
  type ApiRoutine,
  routineDayLabel,
} from "@/lib/routine-types";

type RoutineSortKey = "latest" | "views" | "comments" | "likes";

const sortOptions: CommunitySortOption<RoutineSortKey>[] = [
  { key: "latest", label: "최신순" },
  { key: "views", label: "조회순" },
  { key: "comments", label: "댓글순" },
  { key: "likes", label: "추천순" },
];

function ThumbIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
      <path d="M7 11l4-8a3 3 0 0 1 3 3v4h5a2 2 0 0 1 2 2l-1 7a2 2 0 0 1-2 2H7V11Z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
    </svg>
  );
}

function exerciseCount(routine: ApiRoutine) {
  return (routine.days ?? []).reduce(
    (count, day) => count + (day._count?.exercises ?? day.exercises?.length ?? 0),
    0,
  );
}

type RoutineBoardClientProps = {
  initialRoutines: ApiRoutine[];
  initialErrorMessage: string | null;
};

export default function RoutineBoardClient({ initialRoutines, initialErrorMessage }: RoutineBoardClientProps) {
  const [routines, setRoutines] = useState(initialRoutines);
  const [sortKey, setSortKey] = useState<RoutineSortKey>("latest");
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const changeSort = async (nextSortKey: RoutineSortKey) => {
    if (nextSortKey === sortKey || isLoading) {
      return;
    }

    const previousSortKey = sortKey;
    setSortKey(nextSortKey);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.get<ApiRoutine[]>("/routines", {
        params: { sort: nextSortKey },
      });
      setRoutines(response.data);
    } catch (error) {
      setSortKey(previousSortKey);
      setErrorMessage(
        isAxiosError(error) && error.response?.status === 400
          ? "지원하지 않는 정렬 방식입니다."
          : "루틴 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyPublicCode = async (publicCode: string) => {
    try {
      await navigator.clipboard.writeText(publicCode);
      setCopiedCode(publicCode);
    } catch {
      setErrorMessage("고유코드를 복사하지 못했습니다. 직접 선택해 복사해 주세요.");
    }
  };

  return (
    <div className="space-y-6">
      <CommunityContentToolbar
        sortOptions={sortOptions}
        sortKey={sortKey}
        onSortChange={(nextSortKey) => void changeSort(nextSortKey)}
        writeCategory="ROUTINE"
      />

      <section aria-busy={isLoading} aria-label="나의 루틴 목록">
        {errorMessage && <p className="mb-3 text-sm text-red-700">{errorMessage}</p>}

        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
            루틴을 불러오는 중입니다.
          </div>
        ) : routines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
            아직 등록된 루틴이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {routines.map((routine) => {
              const summary = toPlainTextPreview(routine.summary) || toPlainTextPreview(routine.content);
              const count = exerciseCount(routine);

              return (
                <article
                  key={routine.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-emerald-700">나의 루틴</span>
                      <span aria-hidden="true">·</span>
                      <span>{authorName(routine.author)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatRelativeDateLabel(routine.createdAt)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyPublicCode(routine.publicCode)}
                      className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 font-mono font-semibold text-slate-700 hover:border-emerald-500 hover:text-emerald-700"
                      aria-label={`루틴 고유코드 ${routine.publicCode} 복사`}
                    >
                      {routine.publicCode} {copiedCode === routine.publicCode ? "복사됨" : "복사"}
                    </button>
                  </div>

                  <Link
                    href={`/routines/${routine.id}`}
                    prefetch={false}
                    className="group mt-3 block rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <h2 className="text-base font-bold leading-6 text-slate-950 transition group-hover:text-emerald-700 sm:text-lg">
                      {routine.title}
                    </h2>
                    {summary && <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{summary}</p>}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {(routine.days ?? []).map((day) => (
                        <span
                          key={day.dayOfWeek}
                          className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                        >
                          {routineDayLabel[day.dayOfWeek]}요일 {day._count?.exercises ?? day.exercises?.length ?? 0}개
                        </span>
                      ))}
                      <span className="text-xs text-slate-500">총 운동 {count}개</span>
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1" title="추천">
                        <ThumbIcon />
                        <span>{routine.likeCount ?? routine._count?.likes ?? 0}</span>
                      </span>
                      <span className="inline-flex items-center gap-1" title="댓글">
                        <CommentIcon />
                        <span>{routine._count?.comments ?? 0}</span>
                      </span>
                      <span className="inline-flex items-center gap-1" title="조회">
                        <EyeIcon />
                        <span>{routine.viewCount ?? 0}</span>
                      </span>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <AdSlot slot="POST_LIST_INLINE" label="루틴 광고" />
    </div>
  );
}
