// 서버에서 운동 일지 목록을 준비해 게시판 클라이언트에 전달한다.
import api from "@/lib/api";
import CommunityBoardClient from "@/components/community/CommunityBoardClient";
import {
  type ApiPostListResponse,
  COMMUNITY_POST_PAGE_SIZE,
  type CommunityPostListQuery,
  type CommunitySearchParams,
  type PostPreview,
  parseCommunityPostListQuery,
  toPostPreview,
} from "@/lib/community-types";

export const dynamic = "force-dynamic";

const loadPosts = async (query: CommunityPostListQuery): Promise<{
  posts: PostPreview[];
  errorMessage: string | null;
  page: number;
  total: number;
  totalPages: number;
}> => {
  try {
    const response = await api.get<ApiPostListResponse>("/posts", {
      params: {
        category: "WORKOUT_LOG",
        page: query.page,
        take: COMMUNITY_POST_PAGE_SIZE,
        sort: query.sort,
        searchType: query.searchType,
        keyword: query.keyword || undefined,
      },
    });

    return {
      posts: response.data.items.map(toPostPreview),
      errorMessage: null,
      page: response.data.page,
      total: response.data.total,
      totalPages: response.data.totalPages,
    };
  } catch {
    return {
      posts: [],
      errorMessage: "운동일지 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      page: query.page,
      total: 0,
      totalPages: 0,
    };
  }
};

export default async function WorkoutLogPage({
  searchParams,
}: {
  searchParams: Promise<CommunitySearchParams>;
}) {
  const query = parseCommunityPostListQuery(await searchParams);
  const { posts, errorMessage, page, total, totalPages } = await loadPosts(query);

  return (
    <CommunityBoardClient
      initialPosts={posts}
      initialErrorMessage={errorMessage}
      query={{ ...query, page }}
      total={total}
      totalPages={totalPages}
      writeCategory="WORKOUT_LOG"
      adLabel="운동일지 광고"
    />
  );
}
