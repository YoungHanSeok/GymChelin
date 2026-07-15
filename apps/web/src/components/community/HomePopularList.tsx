"use client";

// 인기 게시글을 슬라이드 목록으로 표시한다.
import Link from "next/link";
import { Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { PostPreview } from "@/lib/community-types";
import "swiper/css";
import "swiper/css/pagination";

const categoryLabel = {
  FREE: "자유게시판",
  WORKOUT_LOG: "운동일지",
} as const;

const categoryPath = {
  FREE: "free",
  WORKOUT_LOG: "workout-log",
} as const;

const postsPerColumn = 5;
const popularPostSlotCount = postsPerColumn * 2;

function PopularPostRow({ post, showNew }: { post: PostPreview; showNew: boolean }) {
  const boardPath = `/boards/${categoryPath[post.category]}`;
  const postPath = `${boardPath}/${post.id}`;

  return (
    <article className="h-[46px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300 hover:shadow-md">
      <div className="flex h-full items-center gap-3 px-3">
        <Link
          href={postPath}
          className="group flex min-w-0 flex-1 items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <h2 className="min-w-0 truncate text-sm font-semibold text-slate-950 transition group-hover:text-emerald-700">
            {post.title}
          </h2>
          {showNew && (
            <span
              aria-label="새 글"
              className="shrink-0 rounded bg-rose-500 px-1 py-0.5 text-[9px] font-black leading-none text-white"
            >
              NEW
            </span>
          )}
          <span className="shrink-0 text-xs font-semibold text-emerald-700">({post.commentCount})</span>
        </Link>
        <Link
          href={boardPath}
          aria-label={`${categoryLabel[post.category]} 목록으로 이동`}
          className="shrink-0 rounded border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {categoryLabel[post.category]}
        </Link>
      </div>
    </article>
  );
}

function EmptyPopularPostRow() {
  return (
    <div
      aria-hidden="true"
      className="h-[46px] rounded-lg border border-dashed border-slate-200 bg-white"
    />
  );
}

function PopularPostColumn({ posts, showNew }: { posts: (PostPreview | null)[]; showNew: boolean }) {
  return (
    <div className="space-y-2">
      {posts.map((post, index) =>
        post ? (
          <PopularPostRow key={`${post.category}-${post.id}`} post={post} showNew={showNew} />
        ) : (
          <EmptyPopularPostRow key={`empty-${index}`} />
        ),
      )}
    </div>
  );
}

export default function HomePopularList({ posts, showNew }: { posts: PostPreview[]; showNew: boolean }) {
  const slots = Array.from(
    { length: popularPostSlotCount },
    (_, index): PostPreview | null => posts[index] ?? null,
  );
  const columns = [slots.slice(0, postsPerColumn), slots.slice(postsPerColumn)];

  return (
    <>
      <div className="hidden grid-cols-2 gap-6 md:grid">
        {columns.map((column, index) => (
          <PopularPostColumn key={`desktop-column-${index}`} posts={column} showNew={showNew} />
        ))}
      </div>

      <div className="md:hidden">
        <Swiper
          modules={[Pagination]}
          slidesPerView={1}
          spaceBetween={16}
          pagination={{ clickable: true }}
          className="home-popular-swiper !pb-8"
          aria-label="인기글 목록"
        >
          {columns.map((column, index) => (
            <SwiperSlide key={`mobile-column-${index}`}>
              <PopularPostColumn posts={column} showNew={showNew} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </>
  );
}
