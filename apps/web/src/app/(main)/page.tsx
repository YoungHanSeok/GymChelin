"use client";

import AdSlot from "@/components/ads/AdSlot";
import PostList from "@/components/community/PostList";
import api from "@/lib/api";
import {
  type ApiGym,
  type ApiPost,
  type ApiRoutine,
  type ApiWiki,
  type GymPreview,
  type PostPreview,
  type RoutinePreview,
  type WikiPreview,
  toPostPreview,
  toRoutinePreview,
  toWikiPreview,
} from "@/lib/community-types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function HomePage() {
  const [posts, setPosts] = useState<PostPreview[]>([]);
  const [dailyPopular, setDailyPopular] = useState<{
    FREE: PostPreview[];
    WORKOUT_LOG: PostPreview[];
  }>({ FREE: [], WORKOUT_LOG: [] });
  const [routines, setRoutines] = useState<RoutinePreview[]>([]);
  const [gyms, setGyms] = useState<GymPreview[]>([]);
  const [wikiItems, setWikiItems] = useState<WikiPreview[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      const [postsResult, dailyResult, routinesResult, gymsResult, wikiResult] = await Promise.allSettled([
        api.get<ApiPost[]>("/posts", { params: { take: 8 } }),
        api.get<{ FREE: ApiPost[]; WORKOUT_LOG: ApiPost[] }>("/posts/daily-popular"),
        api.get<ApiRoutine[]>("/routines", { params: { take: 6 } }),
        api.get<{ places: ApiGym[] }>("/gyms/search", { params: { query: "헬스장" } }),
        api.get<ApiWiki[]>("/wiki"),
      ]);

      if (!isMounted) {
        return;
      }

      if (postsResult.status === "fulfilled") {
        setPosts(postsResult.value.data.map(toPostPreview));
      }

      if (dailyResult.status === "fulfilled") {
        setDailyPopular({
          FREE: dailyResult.value.data.FREE.map(toPostPreview),
          WORKOUT_LOG: dailyResult.value.data.WORKOUT_LOG.map(toPostPreview),
        });
      }

      if (routinesResult.status === "fulfilled") {
        setRoutines(routinesResult.value.data.map(toRoutinePreview));
      }

      if (gymsResult.status === "fulfilled") {
        setGyms(gymsResult.value.data.places);
      }

      if (wikiResult.status === "fulfilled") {
        setWikiItems(wikiResult.value.data.map(toWikiPreview));
      }
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const popularPosts = useMemo(() => {
    const dailyPosts = [...dailyPopular.FREE, ...dailyPopular.WORKOUT_LOG];
    return dailyPosts.length > 0 ? dailyPosts : posts;
  }, [dailyPopular, posts]);

  const freePosts = dailyPopular.FREE.length > 0 ? dailyPopular.FREE : posts.filter((post) => post.category === "FREE");
  const workoutPosts =
    dailyPopular.WORKOUT_LOG.length > 0
      ? dailyPopular.WORKOUT_LOG
      : posts.filter((post) => post.category === "WORKOUT_LOG");

  const stats = [
    ["오늘 인기글", String(popularPosts.length), "커뮤니티"],
    ["등록 루틴", String(routines.length), "좋아요순"],
    ["헬스장 리뷰", String(gyms.reduce((sum, gym) => sum + gym.reviewCount, 0)), "자체 평점"],
    ["위키 운동", String(wikiItems.length), "검색 가능"],
  ];

  return (
    <div className="space-y-8">
      <section className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold text-emerald-700">웨이트 커뮤니티</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">짐슐랭</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          헬스장 리뷰, 운동일지, 루틴 공유, 웨이트 지식을 한곳에서 찾는 트레이닝 커뮤니티입니다.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {stats.map(([label, value, helper]) => (
          <div key={label} className="border-t border-slate-900 pt-3">
            <strong className="block text-2xl font-black text-slate-950">{value}</strong>
            <span className="mt-1 block text-sm font-medium text-slate-700">{label}</span>
            <span className="text-xs text-slate-500">{helper}</span>
          </div>
        ))}
      </section>

      <PostList posts={popularPosts} title="메뉴별 일일 인기글" />

      <AdSlot slot="POST_LIST_INLINE" label="게시글 중간 광고" />

      <div className="grid gap-8 xl:grid-cols-2">
        <PostList posts={freePosts} title="자유게시판 인기글" href="/boards/free" />
        <PostList posts={workoutPosts} title="운동일지 인기글" href="/boards/workout-log" />
      </div>

      <section className="grid gap-8 xl:grid-cols-2">
        <div className="border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 py-3">
            <h2 className="text-base font-semibold text-slate-950">나의 루틴 인기순</h2>
            <Link href="/routines" className="text-sm font-medium text-emerald-700 hover:text-emerald-900">
              더보기
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {routines.length === 0 ? (
              <p className="py-6 text-sm text-slate-500">아직 등록된 루틴이 없습니다.</p>
            ) : (
              routines.map((routine) => (
                <article key={routine.id} className="py-4">
                  <h3 className="font-semibold text-slate-950">{routine.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{routine.summary}</p>
                  <div className="mt-2 text-xs text-slate-500">
                    {routine.author} · 좋아요 {routine.likeCount} · {routine.createdAt}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 py-3">
            <h2 className="text-base font-semibold text-slate-950">헬스장 리뷰 요약</h2>
            <Link href="/gyms" className="text-sm font-medium text-emerald-700 hover:text-emerald-900">
              더보기
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {gyms.length === 0 ? (
              <p className="py-6 text-sm text-slate-500">아직 표시할 헬스장 리뷰가 없습니다.</p>
            ) : (
              gyms.map((gym) => (
                <article key={gym.providerPlaceId} className="py-4">
                  <h3 className="font-semibold text-slate-950">{gym.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{gym.addressName}</p>
                  <div className="mt-2 text-xs text-slate-500">
                    짐슐랭 {gym.avgRating.toFixed(1)}점 · 리뷰 {gym.reviewCount}개 · 외부 평점 공식 제공 시 표기
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-950">웨이트 위키 빠른 검색</h2>
          <Link href="/wiki" className="text-sm font-medium text-emerald-700 hover:text-emerald-900">
            전체 보기
          </Link>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {wikiItems.length === 0 ? (
            <p className="text-sm text-slate-500 md:col-span-3">아직 등록된 위키 콘텐츠가 없습니다.</p>
          ) : (
            wikiItems.slice(0, 3).map((item) => (
              <Link
                key={item.slug}
                href="/wiki"
                className="border-t border-slate-300 pt-3 hover:border-emerald-600"
              >
                <h3 className="font-semibold text-slate-950">{item.name}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                <p className="mt-2 text-xs text-slate-500">{item.targetMuscles.join(", ")}</p>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
