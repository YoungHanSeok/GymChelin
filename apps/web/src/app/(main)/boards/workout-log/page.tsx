"use client";

import AdSlot from "@/components/ads/AdSlot";
import PostList from "@/components/community/PostList";
import api from "@/lib/api";
import { type ApiPost, type PostPreview, toPostPreview } from "@/lib/community-types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function WorkoutLogPage() {
  const [posts, setPosts] = useState<PostPreview[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadPosts = async () => {
      try {
        const response = await api.get<ApiPost[]>("/posts", {
          params: { category: "WORKOUT_LOG" },
        });

        if (isMounted) {
          setPosts(response.data.map(toPostPreview));
        }
      } catch {
        if (isMounted) {
          setPosts([]);
        }
      }
    };

    void loadPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-950">운동일지</h1>
        <p className="mt-2 text-sm text-slate-600">
          오늘의 세트, 중량, 컨디션을 기록하고 다른 리프터에게 피드백을 받을 수 있습니다.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex gap-2 text-sm">
          <button className="rounded border border-slate-900 px-3 py-2 font-semibold text-slate-950">오늘 인기</button>
          <button className="rounded border border-slate-300 px-3 py-2 text-slate-600">최신 기록</button>
        </div>
        <Link href="/login" className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          로그인 후 기록하기
        </Link>
      </div>

      <PostList posts={posts} title="운동일지 글" />
      <AdSlot slot="POST_LIST_INLINE" label="운동일지 광고" />
    </div>
  );
}
