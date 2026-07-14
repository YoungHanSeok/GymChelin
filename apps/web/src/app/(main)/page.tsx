"use client";

import AdSlot from "@/components/ads/AdSlot";
import { HomePostCard, HomeRoutineCard } from "@/components/community/HomeFeedCard";
import HomePopularList from "@/components/community/HomePopularList";
import api from "@/lib/api";
import {
  type ApiPost,
  type ApiRoutine,
  type PostPreview,
  type RoutinePreview,
  toPostPreview,
  toRoutinePreview,
} from "@/lib/community-types";
import { useEffect, useMemo, useState } from "react";

type PopularTab = "today" | "week" | "month" | "notice";
type FeedTab = "all" | "workout" | "free" | "routine";

type PaginatedResponse<Item> = {
  items: Item[];
  total: number;
  page: number;
  take: number;
  totalPages: number;
};

type HomeFeedItem =
  | { key: string; kind: "post"; timestamp: number; post: PostPreview }
  | { key: string; kind: "routine"; timestamp: number; routine: RoutinePreview };

const popularTabs: { id: PopularTab; label: string }[] = [
  { id: "today", label: "오늘의 인기글" },
  { id: "week", label: "이번주 인기글" },
  { id: "month", label: "이달의 인기글" },
  { id: "notice", label: "공지사항" },
];

const feedTabs: { id: FeedTab; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "workout", label: "운동일지" },
  { id: "free", label: "자유게시판" },
  { id: "routine", label: "나의 루틴" },
];

const dayInMilliseconds = 24 * 60 * 60 * 1000;

function getTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function selectPopularPosts(posts: ApiPost[], days: number) {
  const since = Date.now() - days * dayInMilliseconds;

  return posts
    .filter((post) => getTimestamp(post.createdAt) >= since)
    .sort((first, second) => {
      const viewDifference = second.viewCount - first.viewCount;

      if (viewDifference !== 0) {
        return viewDifference;
      }

      const likeDifference = (second._count?.reactions ?? 0) - (first._count?.reactions ?? 0);
      return likeDifference !== 0 ? likeDifference : getTimestamp(second.createdAt) - getTimestamp(first.createdAt);
    })
    .slice(0, 10)
    .map(toPostPreview);
}

function TabList<T extends string>({
  tabs,
  activeTab,
  onChange,
  label,
}: {
  tabs: { id: T; label: string }[];
  activeTab: T;
  onChange: (tab: T) => void;
  label: string;
}) {
  return (
    <div className="overflow-x-auto border-b border-slate-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div role="tablist" aria-label={label} className="flex min-w-max gap-6 sm:gap-8">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${label}-panel`}
              onClick={() => onChange(tab.id)}
              className={`border-b-2 px-0.5 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                isActive
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyFeed({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export default function HomePage() {
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [dailyPopularPosts, setDailyPopularPosts] = useState<ApiPost[]>([]);
  const [routines, setRoutines] = useState<ApiRoutine[]>([]);
  const [activePopularTab, setActivePopularTab] = useState<PopularTab>("today");
  const [activeFeedTab, setActiveFeedTab] = useState<FeedTab>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadHome = async () => {
      const [postsResult, dailyResult, routinesResult] = await Promise.allSettled([
        api.get<PaginatedResponse<ApiPost>>("/posts", { params: { page: 1, take: 50 } }),
        api.get<{ FREE: ApiPost[]; WORKOUT_LOG: ApiPost[] }>("/posts/daily-popular"),
        api.get<PaginatedResponse<ApiRoutine>>("/routines", { params: { page: 1, take: 12 } }),
      ]);

      if (!isMounted) {
        return;
      }

      if (postsResult.status === "fulfilled") {
        setPosts(postsResult.value.data.items);
      }

      if (dailyResult.status === "fulfilled") {
        setDailyPopularPosts([...dailyResult.value.data.FREE, ...dailyResult.value.data.WORKOUT_LOG]);
      }

      if (routinesResult.status === "fulfilled") {
        setRoutines(routinesResult.value.data.items);
      }

      setIsLoading(false);
    };

    void loadHome();

    return () => {
      isMounted = false;
    };
  }, []);

  const popularPostsByTab = useMemo<Record<Exclude<PopularTab, "notice">, PostPreview[]>>(() => {
    const todayPosts =
      dailyPopularPosts.length > 0 ? selectPopularPosts(dailyPopularPosts, 1) : selectPopularPosts(posts, 1);

    return {
      today: todayPosts,
      week: selectPopularPosts(posts, 7),
      month: selectPopularPosts(posts, 30),
    };
  }, [dailyPopularPosts, posts]);

  const feedItems = useMemo<Record<FeedTab, HomeFeedItem[]>>(() => {
    const postItems: HomeFeedItem[] = posts.map((post) => ({
      key: `post-${post.category}-${post.id}`,
      kind: "post",
      timestamp: getTimestamp(post.createdAt),
      post: toPostPreview(post),
    }));
    const routineItems: HomeFeedItem[] = routines.map((routine) => ({
      key: `routine-${routine.id}`,
      kind: "routine",
      timestamp: getTimestamp(routine.createdAt),
      routine: toRoutinePreview(routine),
    }));

    return {
      all: [...postItems, ...routineItems].sort((first, second) => second.timestamp - first.timestamp).slice(0, 12),
      workout: postItems.filter((item) => item.kind === "post" && item.post.category === "WORKOUT_LOG").slice(0, 12),
      free: postItems.filter((item) => item.kind === "post" && item.post.category === "FREE").slice(0, 12),
      routine: routineItems.slice(0, 12),
    };
  }, [posts, routines]);

  const activePopularPosts = activePopularTab === "notice" ? [] : popularPostsByTab[activePopularTab];
  const activeFeedItems = feedItems[activeFeedTab];

  return (
    <div className="space-y-10">
      <h1 className="sr-only">짐슐랭 메인</h1>

      <section aria-label="기간별 인기글">
        <TabList
          tabs={popularTabs}
          activeTab={activePopularTab}
          onChange={setActivePopularTab}
          label="인기글"
        />
        <div
          id="인기글-panel"
          role="tabpanel"
          className="mt-5 space-y-2"
        >
          {isLoading ? (
            <EmptyFeed>인기글을 불러오고 있습니다.</EmptyFeed>
          ) : activePopularTab === "notice" ? (
            <EmptyFeed>아직 등록된 공지사항이 없습니다.</EmptyFeed>
          ) : (
            <HomePopularList
              key={activePopularTab}
              posts={activePopularPosts}
              showNew={activePopularTab === "today"}
            />
          )}
        </div>
      </section>

      <AdSlot slot="POST_LIST_INLINE" label="게시글 중간 광고" />

      <section aria-label="통합 커뮤니티 목록">
        <TabList tabs={feedTabs} activeTab={activeFeedTab} onChange={setActiveFeedTab} label="커뮤니티" />
        <div
          id="커뮤니티-panel"
          role="tabpanel"
          className="mt-5 space-y-3"
        >
          {isLoading ? (
            <EmptyFeed>커뮤니티 글을 불러오고 있습니다.</EmptyFeed>
          ) : activeFeedItems.length === 0 ? (
            <EmptyFeed>아직 표시할 글이 없습니다.</EmptyFeed>
          ) : (
            activeFeedItems.map((item) =>
              item.kind === "post" ? (
                <HomePostCard key={item.key} post={item.post} />
              ) : (
                <HomeRoutineCard key={item.key} routine={item.routine} />
              ),
            )
          )}
        </div>
      </section>
    </div>
  );
}
