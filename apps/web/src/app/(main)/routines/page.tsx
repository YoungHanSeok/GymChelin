import { sampleRoutines } from "@/lib/mock-data";
import Link from "next/link";

export default function RoutinesPage() {
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
        <Link href="/login" className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          로그인 후 루틴 올리기
        </Link>
      </div>

      <div className="divide-y divide-slate-100 border-b border-slate-200">
        {sampleRoutines.map((routine, index) => (
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
        ))}
      </div>
    </div>
  );
}
