// 서버에서 루틴 상세 데이터를 준비해 클라이언트 화면에 전달한다.
import Link from "next/link";
import type { ApiRoutine } from "@/lib/routine-types";
import RoutineDetailClient from "./RoutineDetailClient";

export const dynamic = "force-dynamic";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

type RoutineLoadResult = {
  routine: ApiRoutine | null;
  errorMessage: string | null;
};

const getRoutine = async (id: string): Promise<RoutineLoadResult> => {
  const routineId = Number(id);

  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(routineId)) {
    return {
      routine: null,
      errorMessage: "올바르지 않은 루틴 주소입니다.",
    };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/routines/${routineId}`, {
      cache: "no-store",
    });

    if (response.status === 404) {
      return { routine: null, errorMessage: null };
    }

    if (!response.ok) {
      return {
        routine: null,
        errorMessage: "루틴을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      };
    }

    return {
      routine: (await response.json()) as ApiRoutine,
      errorMessage: null,
    };
  } catch {
    return {
      routine: null,
      errorMessage: "루틴을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
};

export default async function RoutineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { routine, errorMessage } = await getRoutine(id);

  if (!routine) {
    return (
      <section className="border-b border-slate-200 py-8">
        <Link href="/routines" className="text-sm font-medium text-emerald-700 hover:text-emerald-900">
          나의 루틴으로 돌아가기
        </Link>
        <p className={`mt-5 text-sm ${errorMessage ? "text-red-700" : "text-slate-500"}`}>
          {errorMessage ?? "루틴을 찾을 수 없습니다."}
        </p>
      </section>
    );
  }

  return <RoutineDetailClient initialRoutine={routine} />;
}
