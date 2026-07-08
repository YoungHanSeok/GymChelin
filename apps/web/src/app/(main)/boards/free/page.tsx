import AdSlot from "@/components/ads/AdSlot";
import PostList from "@/components/community/PostList";
import WriteEntryButton from "@/components/community/WriteEntryButton";
import api from "@/lib/api";
import { type ApiPost, type PostPreview, toPostPreview } from "@/lib/community-types";

export const dynamic = "force-dynamic";

const loadPosts = async (): Promise<{
  posts: PostPreview[];
  errorMessage: string | null;
}> => {
  try {
    const response = await api.get<ApiPost[]>("/posts", {
      params: { category: "FREE" },
    });

    return {
      posts: response.data.map(toPostPreview),
      errorMessage: null,
    };
  } catch {
    return {
      posts: [],
      errorMessage: "자유게시판 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
};

export default async function FreeBoardPage() {
  const { posts, errorMessage } = await loadPosts();

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
        <WriteEntryButton category="FREE">작성하기</WriteEntryButton>
      </div>

      <PostList posts={posts} title="자유게시판 글" errorMessage={errorMessage} />
      <AdSlot slot="POST_LIST_INLINE" label="게시판 광고" />
    </div>
  );
}
