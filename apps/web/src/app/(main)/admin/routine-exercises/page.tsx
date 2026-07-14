"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import Modal from "@/app/_components/modalComponent";
import api from "@/lib/api";
import { isAdminRole, useAuthSession } from "@/lib/auth-session";

type RoutineExerciseItem = {
  id: number;
  name: string;
  targetBodyPart: string;
  equipment: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type RoutineExerciseListResponse = {
  items: RoutineExerciseItem[];
  total: number;
  page: number;
  take: number;
  totalPages: number;
};

type RoutineExerciseOptions = {
  targetBodyParts: string[];
  equipments: string[];
};

type ListFilters = {
  q: string;
  targetBodyPart: string;
  equipment: string;
  status: "ALL" | "ACTIVE" | "INACTIVE";
};

const routineExerciseSchema = z.object({
  name: z.string().trim().min(1, "운동명을 입력해 주세요.").max(80, "운동명은 80자 이하로 입력해 주세요."),
  targetBodyPart: z.string().min(1, "타겟 부위를 선택해 주세요."),
  equipment: z.string().min(1, "기구를 선택해 주세요."),
  isActive: z.boolean(),
});

type RoutineExerciseFormValues = z.infer<typeof routineExerciseSchema>;

const defaultFormValues: RoutineExerciseFormValues = {
  name: "",
  targetBodyPart: "",
  equipment: "",
  isActive: true,
};

const defaultListFilters: ListFilters = {
  q: "",
  targetBodyPart: "",
  equipment: "",
  status: "ALL",
};

const getApiMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response
  ) {
    const responseData = error.response.data;
    if (
      typeof responseData === "object" &&
      responseData !== null &&
      "message" in responseData &&
      typeof responseData.message === "string"
    ) {
      return responseData.message;
    }
  }

  return fallback;
};

export default function AdminRoutineExercisesPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthSession();
  const formSectionRef = useRef<HTMLElement | null>(null);
  const didRequestInitialData = useRef(false);
  const [items, setItems] = useState<RoutineExerciseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [options, setOptions] = useState<RoutineExerciseOptions>({ targetBodyParts: [], equipments: [] });
  const [filters, setFilters] = useState<ListFilters>(defaultListFilters);
  const [appliedFilters, setAppliedFilters] = useState<ListFilters>(defaultListFilters);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isListLoading, setIsListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deactivationTarget, setDeactivationTarget] = useState<RoutineExerciseItem | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const userIsAdmin = isAdminRole(user?.role);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoutineExerciseFormValues>({
    resolver: zodResolver(routineExerciseSchema),
    defaultValues: defaultFormValues,
  });

  const loadExercises = useCallback(async (nextFilters: ListFilters, page = 1, showLoading = true) => {
    if (showLoading) {
      setIsListLoading(true);
    }
    setListError(null);

    try {
      const response = await api.get<RoutineExerciseListResponse>("/admin/routine-exercises", {
        params: {
          q: nextFilters.q.trim(),
          targetBodyPart: nextFilters.targetBodyPart,
          equipment: nextFilters.equipment,
          status: nextFilters.status,
          page,
          take: 30,
        },
      });
      setItems(response.data.items);
      setTotal(response.data.total);
      setCurrentPage(response.data.page);
      setTotalPages(response.data.totalPages);
      setAppliedFilters(nextFilters);
    } catch (error) {
      setItems([]);
      setTotal(0);
      setListError(getApiMessage(error, "운동 목록을 불러오지 못했습니다."));
    } finally {
      if (showLoading) {
        setIsListLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      router.replace("/login?redirect=/admin/routine-exercises");
      return;
    }

    if (!userIsAdmin) {
      router.replace("/");
      return;
    }

    if (didRequestInitialData.current) {
      return;
    }
    didRequestInitialData.current = true;

    const loadInitialData = async () => {
      setIsInitialLoading(true);
      setListError(null);

      try {
        const [optionsResponse, listResponse] = await Promise.all([
          api.get<RoutineExerciseOptions>("/admin/routine-exercises/options"),
          api.get<RoutineExerciseListResponse>("/admin/routine-exercises", {
            params: { status: "ALL", page: 1, take: 30 },
          }),
        ]);
        setOptions(optionsResponse.data);
        setItems(listResponse.data.items);
        setTotal(listResponse.data.total);
        setCurrentPage(listResponse.data.page);
        setTotalPages(listResponse.data.totalPages);
      } catch (error) {
        setListError(getApiMessage(error, "루틴 운동 관리 정보를 불러오지 못했습니다."));
      } finally {
        setIsInitialLoading(false);
      }
    };

    void loadInitialData();
  }, [isAuthLoading, router, user, userIsAdmin]);

  if (isAuthLoading || !user || !userIsAdmin) {
    return <div className="py-12 text-center text-sm text-slate-500">관리자 권한을 확인하는 중입니다.</div>;
  }

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadExercises(filters, 1);
  };

  const clearFilters = () => {
    setFilters(defaultListFilters);
    void loadExercises(defaultListFilters, 1);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setFormError(null);
    setSuccessMessage(null);
    reset(defaultFormValues);
  };

  const startEditing = (item: RoutineExerciseItem) => {
    setEditingId(item.id);
    setFormError(null);
    setSuccessMessage(null);
    reset({
      name: item.name,
      targetBodyPart: item.targetBodyPart,
      equipment: item.equipment,
      isActive: item.isActive,
    });
    window.requestAnimationFrame(() => formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const saveExercise = handleSubmit(async (values) => {
    setFormError(null);
    setSuccessMessage(null);

    try {
      if (editingId === null) {
        await api.post("/admin/routine-exercises", values);
        setSuccessMessage("루틴 운동을 등록했습니다.");
      } else {
        await api.patch(`/admin/routine-exercises/${editingId}`, values);
        setSuccessMessage("루틴 운동을 수정했습니다.");
      }

      setEditingId(null);
      reset(defaultFormValues);
      await loadExercises(appliedFilters, currentPage, false);
    } catch (error) {
      setFormError(getApiMessage(error, editingId === null ? "운동 등록에 실패했습니다." : "운동 수정에 실패했습니다."));
    }
  });

  const deactivateExercise = async () => {
    if (!deactivationTarget) {
      return;
    }

    setIsDeactivating(true);
    setListError(null);

    try {
      await api.delete(`/admin/routine-exercises/${deactivationTarget.id}`);
      setDeactivationTarget(null);
      setSuccessMessage("루틴 운동을 사용 해제했습니다.");
      if (editingId === deactivationTarget.id) {
        setEditingId(null);
        reset(defaultFormValues);
      }
      await loadExercises(appliedFilters, currentPage, false);
    } catch (error) {
      setListError(getApiMessage(error, "운동 사용 해제에 실패했습니다."));
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-semibold text-emerald-700">관리자 기능</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">루틴 운동추가</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          나의 루틴에서 검색할 운동을 등록하고 사용 여부를 관리합니다.
        </p>
      </header>

      {isInitialLoading ? (
        <p role="status" className="py-12 text-center text-sm text-slate-500">관리 정보를 불러오는 중입니다.</p>
      ) : (
        <>
          <section ref={formSectionRef} className="scroll-mt-24 border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">{editingId === null ? "운동 등록" : "운동 수정"}</h2>
                <p className="mt-1 text-sm text-slate-500">운동명, 타겟 부위, 기구를 입력해 주세요.</p>
              </div>
              {editingId !== null && (
                <button type="button" onClick={cancelEditing} className="button-secondary w-auto px-3 py-2">
                  수정 취소
                </button>
              )}
            </div>

            <form onSubmit={saveExercise} className="mt-5 space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label htmlFor="routine-exercise-name" className="mb-1.5 block text-sm font-semibold text-slate-700">
                    운동명
                  </label>
                  <input
                    id="routine-exercise-name"
                    {...register("name")}
                    className="input-style"
                    placeholder="예: 바벨 벤치프레스"
                    maxLength={80}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-700">{errors.name.message}</p>}
                </div>
                <div>
                  <label htmlFor="routine-exercise-target-part" className="mb-1.5 block text-sm font-semibold text-slate-700">
                    타겟 부위
                  </label>
                  <select id="routine-exercise-target-part" {...register("targetBodyPart")} className="input-style">
                    <option value="">선택해 주세요</option>
                    {options.targetBodyParts.map((targetBodyPart) => (
                      <option key={targetBodyPart} value={targetBodyPart}>{targetBodyPart}</option>
                    ))}
                  </select>
                  {errors.targetBodyPart && <p className="mt-1 text-xs text-red-700">{errors.targetBodyPart.message}</p>}
                </div>
                <div>
                  <label htmlFor="routine-exercise-equipment" className="mb-1.5 block text-sm font-semibold text-slate-700">
                    기구
                  </label>
                  <select id="routine-exercise-equipment" {...register("equipment")} className="input-style">
                    <option value="">선택해 주세요</option>
                    {options.equipments.map((equipment) => (
                      <option key={equipment} value={equipment}>{equipment}</option>
                    ))}
                  </select>
                  {errors.equipment && <p className="mt-1 text-xs text-red-700">{errors.equipment.message}</p>}
                </div>
              </div>

              <label className="flex w-fit items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" {...register("isActive")} className="h-4 w-4 accent-emerald-700" />
                사용 여부
              </label>
              <p className="text-xs text-slate-500">체크를 해제하면 나의 루틴 운동 검색 목록에 표시되지 않습니다.</p>

              {formError && (
                <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
              )}
              {successMessage && (
                <p role="status" className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p>
              )}

              <div className="flex justify-end">
                <button type="submit" disabled={isSubmitting} className="button-primary w-auto min-w-28">
                  {isSubmitting ? "저장 중" : "저장"}
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">등록 운동 목록</h2>
                <p className="mt-1 text-sm text-slate-500">검색 결과 {total}건</p>
              </div>
            </div>

            <form onSubmit={submitFilters} className="grid gap-3 border-y border-slate-200 py-4 md:grid-cols-[minmax(0,1fr)_130px_130px_120px_auto]">
              <div>
                <label htmlFor="routine-exercise-search" className="sr-only">운동명 검색</label>
                <input
                  id="routine-exercise-search"
                  value={filters.q}
                  onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                  className="input-style"
                  placeholder="운동명 검색"
                  maxLength={80}
                />
              </div>
              <select
                aria-label="타겟 부위 필터"
                value={filters.targetBodyPart}
                onChange={(event) => setFilters((current) => ({ ...current, targetBodyPart: event.target.value }))}
                className="input-style"
              >
                <option value="">전체 부위</option>
                {options.targetBodyParts.map((targetBodyPart) => (
                  <option key={targetBodyPart} value={targetBodyPart}>{targetBodyPart}</option>
                ))}
              </select>
              <select
                aria-label="기구 필터"
                value={filters.equipment}
                onChange={(event) => setFilters((current) => ({ ...current, equipment: event.target.value }))}
                className="input-style"
              >
                <option value="">전체 기구</option>
                {options.equipments.map((equipment) => (
                  <option key={equipment} value={equipment}>{equipment}</option>
                ))}
              </select>
              <select
                aria-label="사용 상태 필터"
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as ListFilters["status"] }))}
                className="input-style"
              >
                <option value="ALL">전체 상태</option>
                <option value="ACTIVE">사용</option>
                <option value="INACTIVE">사용 안 함</option>
              </select>
              <div className="flex gap-2">
                <button type="submit" disabled={isListLoading} className="button-primary w-auto px-4">
                  검색
                </button>
                <button type="button" onClick={clearFilters} disabled={isListLoading} className="button-secondary w-auto px-3">
                  초기화
                </button>
              </div>
            </form>

            {listError && (
              <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{listError}</p>
            )}

            <div className="overflow-x-auto border-y border-slate-200">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-3">운동명</th>
                    <th scope="col" className="px-4 py-3">타겟 부위</th>
                    <th scope="col" className="px-4 py-3">기구</th>
                    <th scope="col" className="px-4 py-3">사용 여부</th>
                    <th scope="col" className="px-4 py-3 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isListLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-500">운동 목록을 불러오는 중입니다.</td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-500">등록된 운동이 없습니다.</td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="text-slate-700">
                        <td className="px-4 py-3 font-semibold text-slate-950">{item.name}</td>
                        <td className="px-4 py-3">{item.targetBodyPart}</td>
                        <td className="px-4 py-3">{item.equipment}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded px-2 py-1 text-xs font-bold ${item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {item.isActive ? "사용" : "사용 안 함"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEditing(item)}
                              className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-600 hover:text-emerald-700"
                            >
                              수정
                            </button>
                            {item.isActive && (
                              <button
                                type="button"
                                onClick={() => setDeactivationTarget(item)}
                                className="rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                              >
                                사용 해제
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <nav aria-label="루틴 운동 목록 페이지" className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={isListLoading || currentPage <= 1}
                  onClick={() => void loadExercises(appliedFilters, currentPage - 1)}
                  className="button-secondary w-auto px-4 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  이전
                </button>
                <span className="text-sm font-semibold text-slate-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={isListLoading || currentPage >= totalPages}
                  onClick={() => void loadExercises(appliedFilters, currentPage + 1)}
                  className="button-secondary w-auto px-4 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  다음
                </button>
              </nav>
            )}
          </section>
        </>
      )}

      {deactivationTarget && (
        <Modal
          onClose={() => !isDeactivating && setDeactivationTarget(null)}
          ariaLabelledBy="routine-exercise-deactivation-title"
        >
          <h2 id="routine-exercise-deactivation-title" className="text-xl font-black text-slate-950">
            운동 사용을 해제할까요?
          </h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            <strong className="text-slate-950">{deactivationTarget.name}</strong>은 기존 루틴 데이터에서는 유지되지만,
            새로운 루틴의 운동 검색 목록에는 표시되지 않습니다.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeactivationTarget(null)}
              disabled={isDeactivating}
              className="button-secondary w-auto"
            >
              취소
            </button>
            <button
              type="button"
              onClick={deactivateExercise}
              disabled={isDeactivating}
              className="rounded bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-red-300"
            >
              {isDeactivating ? "처리 중" : "사용 해제"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
