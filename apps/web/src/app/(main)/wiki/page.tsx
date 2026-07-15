"use client";

// 위키 문서를 검색하고 관리자가 편집할 수 있는 화면이다.
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { type ApiWiki, type WikiPreview, toWikiPreview } from "@/lib/community-types";

export default function WikiPage() {
  const [query, setQuery] = useState("");
  const [wikiItems, setWikiItems] = useState<WikiPreview[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadWiki = async () => {
      try {
        const response = await api.get<ApiWiki[]>("/wiki");

        if (isMounted) {
          setWikiItems(response.data.map(toWikiPreview));
        }
      } catch {
        if (isMounted) {
          setWikiItems([]);
        }
      }
    };

    void loadWiki();

    return () => {
      isMounted = false;
    };
  }, []);

  const exercises = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return wikiItems;
    }

    return wikiItems.filter((item) =>
      [item.name, item.description, item.equipment, item.difficulty, ...item.targetMuscles]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, wikiItems]);

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-950">웨이트 위키</h1>
        <p className="mt-2 text-sm text-slate-600">
          운동 방법, 타깃 근육, 효과, 주의사항을 검색할 수 있습니다.
        </p>
      </header>

      <div className="border-b border-slate-200 pb-4">
        <label htmlFor="wiki-search" className="sr-only">
          웨이트 위키 검색
        </label>
        <input
          id="wiki-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="예: 스쿼트, 가슴, 바벨"
          className="input-style"
        />
      </div>

      <div className="grid gap-5">
        {exercises.length === 0 ? (
          <p className="border-b border-slate-200 pb-5 text-sm text-slate-500">표시할 운동 정보가 없습니다.</p>
        ) : (
          exercises.map((exercise) => (
            <article key={exercise.slug} className="border-b border-slate-200 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-950">{exercise.name}</h2>
                <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                  {exercise.difficulty}
                </span>
                <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                  {exercise.equipment}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{exercise.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {exercise.targetMuscles.map((muscle) => (
                  <span key={muscle} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600">
                    {muscle}
                  </span>
                ))}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
