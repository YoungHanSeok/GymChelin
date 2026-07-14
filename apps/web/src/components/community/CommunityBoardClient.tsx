"use client";

import AdSlot from "@/components/ads/AdSlot";
import CommunityContentToolbar, {
  type CommunitySortOption,
} from "@/components/community/CommunityContentToolbar";
import PostList from "@/components/community/PostList";
import type { PostCategory, PostPreview } from "@/lib/community-types";
import { useMemo, useState } from "react";

type SortKey = "latest" | "views" | "comments" | "likes";

const sortOptions: CommunitySortOption<SortKey>[] = [
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

  return (
    <div className="space-y-6">
      <CommunityContentToolbar
        sortOptions={sortOptions}
        sortKey={sortKey}
        onSortChange={setSortKey}
        writeCategory={writeCategory}
      />

      <PostList posts={sortedPosts} errorMessage={initialErrorMessage} />
      <AdSlot slot="POST_LIST_INLINE" label={adLabel} />
    </div>
  );
}
