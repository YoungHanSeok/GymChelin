import CommunityBoardClient from "@/components/community/CommunityBoardClient";
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
    <CommunityBoardClient
      initialPosts={posts}
      initialErrorMessage={errorMessage}
      writeCategory="FREE"
      adLabel="자유게시판 광고"
    />
  );
}
