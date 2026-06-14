import AdSlot from "@/components/ads/AdSlot";
import PostList from "@/components/community/PostList";
import { samplePosts } from "@/lib/mock-data";
import Link from "next/link";

export default function FreeBoardPage() {
  const posts = samplePosts.filter((post) => post.category === "FREE");

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-950">자유게시판</h1>
        <p className="mt-2 text-sm text-slate-600">
          운동 고민, 장비 이야기, 식단, 일상까지 자유롭게 나누는 공간입니다.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex gap-2 text-sm">
          <button className="rounded border border-slate-900 px-3 py-2 font-semibold text-slate-950">인기순</button>
          <button className="rounded border border-slate-300 px-3 py-2 text-slate-600">최신순</button>
        </div>
        <Link href="/login" className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          로그인 후 글쓰기
        </Link>
      </div>

      <PostList posts={posts} title="자유게시판 글" />
      <AdSlot slot="POST_LIST_INLINE" label="게시판 광고" />
    </div>
  );
}
