"use client";

// 게시글 검색, 정렬, 페이지 이동을 포함한 게시판 목록을 표시한다.
import AdSlot from "@/components/ads/AdSlot";
import Pagination from "@/components/common/Pagination";
import CommunityContentToolbar, {
  type CommunitySortOption,
} from "@/components/community/CommunityContentToolbar";
import PostList from "@/components/community/PostList";
import type {
  CommunityPostListQuery,
  CommunitySearchType,
  CommunitySortKey,
  PostCategory,
  PostPreview,
} from "@/lib/community-types";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

const sortOptions: CommunitySortOption<CommunitySortKey>[] = [
  { key: "latest", label: "최신순" },
  { key: "views", label: "조회순" },
  { key: "comments", label: "댓글순" },
  { key: "likes", label: "추천순" },
];

type CommunityBoardClientProps = {
  initialPosts: PostPreview[];
  initialErrorMessage: string | null;
  query: CommunityPostListQuery;
  total: number;
  totalPages: number;
  writeCategory: PostCategory;
  adLabel: string;
};

export default function CommunityBoardClient({
  initialPosts,
  initialErrorMessage,
  query,
  total,
  totalPages,
  writeCategory,
  adLabel,
}: CommunityBoardClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const retry = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const navigate = (nextQuery: Partial<CommunityPostListQuery>) => {
    const mergedQuery = { ...query, ...nextQuery };

    if (
      mergedQuery.page === query.page &&
      mergedQuery.sort === query.sort &&
      mergedQuery.searchType === query.searchType &&
      mergedQuery.keyword === query.keyword
    ) {
      if (initialErrorMessage) {
        retry();
      }
      return;
    }

    const searchParams = new URLSearchParams({
      page: String(mergedQuery.page),
      sort: mergedQuery.sort,
      searchType: mergedQuery.searchType,
    });

    if (mergedQuery.keyword) {
      searchParams.set("keyword", mergedQuery.keyword);
    }

    startTransition(() => {
      router.push(`${pathname}?${searchParams.toString()}`);
    });
  };

  const searchPosts = (searchType: CommunitySearchType, keyword: string) => {
    navigate({ page: 1, searchType, keyword });
  };

  return (
    <div className="space-y-6">
      <CommunityContentToolbar
        sortOptions={sortOptions}
        sortKey={query.sort}
        onSortChange={(sort) => navigate({ page: 1, sort })}
        searchType={query.searchType}
        keyword={query.keyword}
        onSearch={searchPosts}
        writeCategory={writeCategory}
        disabled={isPending}
      />

      <div aria-busy={isPending} className="relative">
        {isPending && (
          <p role="status" className="mb-3 text-sm font-medium text-emerald-700">
            게시글 목록을 불러오는 중입니다.
          </p>
        )}
        <div className={isPending ? "pointer-events-none opacity-50" : undefined}>
          <PostList posts={initialPosts} errorMessage={initialErrorMessage} />
          {initialErrorMessage && (
            <button
              type="button"
              disabled={isPending}
              onClick={retry}
              className="mt-3 rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-50"
            >
              다시 시도
            </button>
          )}
        </div>
      </div>

      {!initialErrorMessage && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <p className="text-sm text-slate-500">총 {total.toLocaleString("ko-KR")}건</p>
          <Pagination
            currentPage={query.page}
            totalPages={totalPages}
            disabled={isPending}
            ariaLabel="게시글 목록 페이지"
            onPageChange={(page) => navigate({ page })}
          />
        </div>
      )}

      <AdSlot slot="POST_LIST_INLINE" label={adLabel} />
    </div>
  );
}
