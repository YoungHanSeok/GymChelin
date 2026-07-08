"use client";

import WriteEntryButton from "@/components/community/WriteEntryButton";
import api from "@/lib/api";
import { type ApiRoutine, type RoutinePreview, toRoutinePreview } from "@/lib/community-types";
import { useEffect, useState } from "react";

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<RoutinePreview[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadRoutines = async () => {
      try {
        const response = await api.get<ApiRoutine[]>("/routines");

        if (isMounted) {
          setRoutines(response.data.map(toRoutinePreview));
        }
      } catch {
        if (isMounted) {
          setRoutines([]);
        }
      }
    };

    void loadRoutines();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-950">나의 루틴</h1>
        <p className="mt-2 text-sm text-slate-600">
          직접 만든 루틴을 공유하고, 좋아요가 많은 루틴은 상단에 노출됩니다.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex gap-2 text-sm">
          <button className="rounded border border-slate-900 px-3 py-2 font-semibold text-slate-950">좋아요순</button>
          <button className="rounded border border-slate-300 px-3 py-2 text-slate-600">최신순</button>
        </div>
        <WriteEntryButton category="ROUTINE">작성하기</WriteEntryButton>
      </div>

      <div className="divide-y divide-slate-100 border-b border-slate-200">
        {routines.length === 0 ? (
          <p className="py-6 text-sm text-slate-500">아직 등록된 루틴이 없습니다.</p>
        ) : (
          routines.map((routine, index) => (
            <article key={routine.id} className="grid gap-4 py-5 md:grid-cols-[56px_minmax(0,1fr)_96px]">
              <div className="text-sm font-black text-emerald-700">#{index + 1}</div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-slate-950">{routine.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{routine.summary}</p>
                <p className="mt-3 text-xs text-slate-500">
                  {routine.author} · {routine.createdAt}
                </p>
              </div>
              <div className="flex items-center justify-start md:justify-end">
                <span className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
                  좋아요 {routine.likeCount}
                </span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
