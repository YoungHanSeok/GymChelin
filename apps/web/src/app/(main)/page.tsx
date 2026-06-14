import AdSlot from "@/components/ads/AdSlot";
import PostList from "@/components/community/PostList";
import { sampleGyms, samplePosts, sampleRoutines, sampleWiki } from "@/lib/mock-data";
import Link from "next/link";

export default function HomePage() {
  const freePosts = samplePosts.filter((post) => post.category === "FREE");
  const workoutPosts = samplePosts.filter((post) => post.category === "WORKOUT_LOG");

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
        {[
          ["오늘 인기글", "24", "커뮤니티"],
          ["등록 루틴", "128", "좋아요순"],
          ["헬스장 리뷰", "312", "자체 평점"],
          ["위키 운동", "54", "검색 가능"],
        ].map(([label, value, helper]) => (
          <div key={label} className="border-t border-slate-900 pt-3">
            <strong className="block text-2xl font-black text-slate-950">{value}</strong>
            <span className="mt-1 block text-sm font-medium text-slate-700">{label}</span>
            <span className="text-xs text-slate-500">{helper}</span>
          </div>
        ))}
      </section>

      <PostList posts={samplePosts} title="메뉴별 일일 인기글" />

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
            {sampleRoutines.map((routine) => (
              <article key={routine.id} className="py-4">
                <h3 className="font-semibold text-slate-950">{routine.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{routine.summary}</p>
                <div className="mt-2 text-xs text-slate-500">
                  {routine.author} · 좋아요 {routine.likeCount} · {routine.createdAt}
                </div>
              </article>
            ))}
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
            {sampleGyms.map((gym) => (
              <article key={gym.providerPlaceId} className="py-4">
                <h3 className="font-semibold text-slate-950">{gym.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{gym.addressName}</p>
                <div className="mt-2 text-xs text-slate-500">
                  짐슐랭 {gym.avgRating.toFixed(1)}점 · 리뷰 {gym.reviewCount}개 · 외부 평점 공식 제공 시 표기
                </div>
              </article>
            ))}
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
          {sampleWiki.map((item) => (
            <Link
              key={item.slug}
              href="/wiki"
              className="border-t border-slate-300 pt-3 hover:border-emerald-600"
            >
              <h3 className="font-semibold text-slate-950">{item.name}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
              <p className="mt-2 text-xs text-slate-500">{item.targetMuscles.join(", ")}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
