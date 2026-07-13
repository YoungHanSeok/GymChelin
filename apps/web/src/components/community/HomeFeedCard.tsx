import Link from "next/link";
import type { PostPreview, RoutinePreview } from "@/lib/community-types";

const categoryLabel = {
  FREE: "자유게시판",
  WORKOUT_LOG: "운동일지",
} as const;

const categoryPath = {
  FREE: "free",
  WORKOUT_LOG: "workout-log",
} as const;

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

export function HomePostCard({ post }: { post: PostPreview }) {
  const postHref = `/boards/${categoryPath[post.category]}/${post.id}`;

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
      <Link
        href={postHref}
        className="group block p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 sm:p-5"
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span className="font-semibold text-emerald-700">{categoryLabel[post.category]}</span>
              <span aria-hidden="true">·</span>
              <span>{post.author}</span>
              <span aria-hidden="true">·</span>
              <span>{post.createdAt}</span>
            </div>
            <h2 className="mt-2 text-base font-bold leading-6 text-slate-950 transition group-hover:text-emerald-700 sm:text-lg">
              {post.title}
            </h2>
            {post.excerpt && <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{post.excerpt}</p>}
            <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1" title="추천">
                <ThumbIcon />
                <span>{post.likeCount}</span>
              </span>
              <span className="inline-flex items-center gap-1" title="댓글">
                <CommentIcon />
                <span>{post.commentCount}</span>
              </span>
              <span className="inline-flex items-center gap-1" title="조회">
                <EyeIcon />
                <span>{post.viewCount}</span>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function HomeRoutineCard({ routine }: { routine: RoutinePreview }) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
      <Link
        href="/routines"
        className="group block p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="font-semibold text-emerald-700">나의 루틴</span>
          <span aria-hidden="true">·</span>
          <span>{routine.author}</span>
          <span aria-hidden="true">·</span>
          <span>{routine.createdAt}</span>
        </div>
        <h2 className="mt-2 text-base font-bold leading-6 text-slate-950 transition group-hover:text-emerald-700 sm:text-lg">
          {routine.title}
        </h2>
        {routine.summary && <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{routine.summary}</p>}
        <div className="mt-4 inline-flex items-center gap-1 text-xs text-slate-500" title="좋아요">
          <ThumbIcon />
          <span>{routine.likeCount}</span>
        </div>
      </Link>
    </article>
  );
}
