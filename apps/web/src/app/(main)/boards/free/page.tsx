import CommunityBoardClient from "@/components/community/CommunityBoardClient";
import api from "@/lib/api";
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
        category: "FREE",
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
      errorMessage: "자유게시판 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      page: query.page,
      total: 0,
      totalPages: 0,
    };
  }
};

export default async function FreeBoardPage({
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
      writeCategory="FREE"
      adLabel="자유게시판 광고"
    />
  );
}
