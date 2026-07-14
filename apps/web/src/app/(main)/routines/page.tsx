import api from "@/lib/api";
import type { ApiRoutine } from "@/lib/routine-types";
import RoutineBoardClient from "./RoutineBoardClient";

export const dynamic = "force-dynamic";

const loadRoutines = async (): Promise<{
  routines: ApiRoutine[];
  errorMessage: string | null;
}> => {
  try {
    const response = await api.get<ApiRoutine[]>("/routines", {
      params: { sort: "latest" },
    });

    return {
      routines: response.data,
      errorMessage: null,
    };
  } catch {
    return {
      routines: [],
      errorMessage: "루틴 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
};

export default async function RoutinesPage() {
  const { routines, errorMessage } = await loadRoutines();

  return <RoutineBoardClient initialRoutines={routines} initialErrorMessage={errorMessage} />;
}
