// 서버에서 루틴 목록을 조회해 목록 컴포넌트에 전달한다.
import api from "@/lib/api";
import {
  type ApiRoutineListResponse,
  ROUTINE_PAGE_SIZE,
  type RoutineListQuery,
  type RoutineSearchParams,
  parseRoutineListQuery,
} from "@/lib/routine-types";
import RoutineBoardClient from "./RoutineBoardClient";

export const dynamic = "force-dynamic";

const loadRoutines = async (query: RoutineListQuery): Promise<{
  response: ApiRoutineListResponse;
  errorMessage: string | null;
}> => {
  try {
    const response = await api.get<ApiRoutineListResponse>("/routines", {
      params: {
        page: query.page,
        take: ROUTINE_PAGE_SIZE,
        sort: query.sort,
        searchType: query.searchType,
        keyword: query.keyword || undefined,
      },
    });

    return {
      response: response.data,
      errorMessage: null,
    };
  } catch {
    return {
      response: {
        items: [],
        total: 0,
        page: query.page,
        take: ROUTINE_PAGE_SIZE,
        totalPages: 0,
      },
      errorMessage: "루틴 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
};

export default async function RoutinesPage({
  searchParams,
}: {
  searchParams: Promise<RoutineSearchParams>;
}) {
  const query = parseRoutineListQuery(await searchParams);
  const { response, errorMessage } = await loadRoutines(query);

  return (
    <RoutineBoardClient
      initialResponse={response}
      initialErrorMessage={errorMessage}
      query={{ ...query, page: response.page }}
    />
  );
}
