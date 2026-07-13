"use client";

import AdSlot from "@/components/ads/AdSlot";
import PostList from "@/components/community/PostList";
import WriteEntryButton from "@/components/community/WriteEntryButton";
import type { PostCategory, PostPreview } from "@/lib/community-types";
import { useMemo, useState } from "react";

type SortKey = "latest" | "views" | "comments" | "likes";

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "latest", label: "최신순" },
  { key: "views", label: "조회순" },
  { key: "comments", label: "댓글순" },
  { key: "likes", label: "추천순" },
];

type CommunityBoardClientProps = {
  initialPosts: PostPreview[];
  initialErrorMessage: string | null;
  writeCategory: PostCategory;
  adLabel: string;
};

export default function CommunityBoardClient({
  initialPosts,
  initialErrorMessage,
  writeCategory,
  adLabel,
}: CommunityBoardClientProps) {
  const [sortKey, setSortKey] = useState<SortKey>("latest");
  const [isSortOpen, setIsSortOpen] = useState(false);

  const sortedPosts = useMemo(() => {
    const nextPosts = [...initialPosts];

    if (sortKey === "views") {
      return nextPosts.sort((first, second) => second.viewCount - first.viewCount);
    }

    if (sortKey === "comments") {
      return nextPosts.sort((first, second) => second.commentCount - first.commentCount);
    }

    if (sortKey === "likes") {
      return nextPosts.sort((first, second) => second.likeCount - first.likeCount);
    }

    return nextPosts;
  }, [initialPosts, sortKey]);

  const selectedSortLabel = sortOptions.find((option) => option.key === sortKey)?.label ?? "최신순";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3 border-b border-slate-200 pb-4">
        <div className="relative">
          <button
            type="button"
            aria-label={`정렬 메뉴 열기, 현재 ${selectedSortLabel}`}
            aria-expanded={isSortOpen}
            aria-haspopup="menu"
            onClick={() => setIsSortOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded border border-slate-300 text-slate-700 hover:border-emerald-600 hover:text-emerald-700"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
              <path d="m8 20 4 3 4-3" />
            </svg>
          </button>
          {isSortOpen && (
            <div role="menu" className="absolute right-0 top-12 z-20 w-32 rounded border border-slate-200 bg-white py-1 shadow-lg">
              {sortOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setSortKey(option.key);
                    setIsSortOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm ${
                    sortKey === option.key
                      ? "font-semibold text-emerald-700"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <WriteEntryButton category={writeCategory}>작성하기</WriteEntryButton>
      </div>

      <PostList posts={sortedPosts} errorMessage={initialErrorMessage} />
      <AdSlot slot="POST_LIST_INLINE" label={adLabel} />
    </div>
  );
}
