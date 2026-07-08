import Link from "next/link";
import type { PostPreview } from "@/lib/community-types";

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

export default function PostList({
  posts,
  title,
  href,
  errorMessage,
}: {
  posts: PostPreview[];
  title?: string;
  href?: string;
  errorMessage?: string | null;
}) {
  return (
    <section className="border-b border-slate-200 bg-white">
      {(title || href) && (
        <div className="flex items-center justify-between border-b border-slate-200 py-3">
          {title && <h2 className="text-base font-semibold text-slate-950">{title}</h2>}
          {href && (
            <Link href={href} className="text-sm font-medium text-emerald-700 hover:text-emerald-900">
              더보기
            </Link>
          )}
        </div>
      )}
      <div className="divide-y divide-slate-100">
        {errorMessage ? (
          <p className="py-6 text-sm text-red-700">{errorMessage}</p>
        ) : posts.length === 0 ? (
          <p className="py-6 text-sm text-slate-500">아직 표시할 글이 없습니다.</p>
        ) : (
          posts.map((post) => {
            const postHref = `/boards/${categoryPath[post.category]}/${post.id}`;

            return (
              <article key={`${post.category}-${post.id}`}>
                <Link href={postHref} className="block py-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-[0.95rem] leading-5 text-slate-500">
                        <span className="font-medium text-emerald-700">{categoryLabel[post.category]}</span>
                        <span>{post.author}</span>
                        <span>{post.createdAt}</span>
                      </div>
                    <h3 className="truncate text-base font-semibold text-slate-900 hover:text-emerald-700">
                      {post.title}
                      <span className="ml-1 text-emerald-700">({post.commentCount})</span>
                    </h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1" title="추천">
                        <ThumbIcon />
                        <span>{post.likeCount}</span>
                      </span>
                      <span className="inline-flex items-center gap-1" title="조회">
                        <EyeIcon />
                        <span>{post.viewCount}</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
