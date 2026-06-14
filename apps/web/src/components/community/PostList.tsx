import Link from "next/link";
import type { PostPreview } from "@/lib/community-types";

const categoryLabel = {
  FREE: "자유게시판",
  WORKOUT_LOG: "운동일지",
} as const;

export default function PostList({
  posts,
  title,
  href,
}: {
  posts: PostPreview[];
  title: string;
  href?: string;
}) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 py-3">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {href && (
          <Link href={href} className="text-sm font-medium text-emerald-700 hover:text-emerald-900">
            더보기
          </Link>
        )}
      </div>
      <div className="divide-y divide-slate-100">
        {posts.length === 0 ? (
          <p className="py-6 text-sm text-slate-500">아직 표시할 글이 없습니다.</p>
        ) : (
          posts.map((post) => (
            <article key={`${post.category}-${post.id}`} className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-emerald-700">{categoryLabel[post.category]}</span>
                    <span>{post.author}</span>
                    <span>{post.createdAt}</span>
                  </div>
                  <Link href={`/boards/${post.category === "FREE" ? "free" : "workout-log"}`} className="block">
                    <h3 className="truncate text-base font-semibold text-slate-900 hover:text-emerald-700">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{post.excerpt}</p>
                </div>
                <div className="grid min-w-24 grid-cols-3 gap-2 text-center text-xs text-slate-500">
                  <span>
                    <strong className="block text-sm text-slate-900">{post.likeCount}</strong>
                    추천
                  </span>
                  <span>
                    <strong className="block text-sm text-slate-900">{post.commentCount}</strong>
                    댓글
                  </span>
                  <span>
                    <strong className="block text-sm text-slate-900">{post.viewCount}</strong>
                    조회
                  </span>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
