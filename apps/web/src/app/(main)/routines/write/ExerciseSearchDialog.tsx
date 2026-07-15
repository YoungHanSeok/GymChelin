"use client";

// 루틴 작성 중 운동 종목을 검색하고 선택하는 대화상자다.
import { FormEvent, useEffect, useRef, useState } from "react";
import Pagination from "@/components/common/Pagination";
import api from "@/lib/api";
import type {
  ExerciseCatalogFilters,
  ExerciseCatalogItem,
  ExerciseCatalogResponse,
} from "./routine-form-types";

type ExerciseSearchDialogProps = {
  dayLabel: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exercise: ExerciseCatalogItem | Omit<ExerciseCatalogItem, "id">) => void;
};

const emptyFilters: ExerciseCatalogFilters = {
  bodyParts: [],
  equipments: [],
};

type ExerciseSearchValues = {
  query: string;
  bodyPart: string;
  equipment: string;
};

const emptySearchValues: ExerciseSearchValues = {
  query: "",
  bodyPart: "",
  equipment: "",
};

const EXERCISE_PAGE_SIZE = 10;

export default function ExerciseSearchDialog({
  dayLabel,
  isOpen,
  onClose,
  onSelect,
}: ExerciseSearchDialogProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [equipment, setEquipment] = useState("");
  const [filters, setFilters] = useState<ExerciseCatalogFilters>(emptyFilters);
  const [items, setItems] = useState<ExerciseCatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [appliedSearchValues, setAppliedSearchValues] = useState<ExerciseSearchValues>(emptySearchValues);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customBodyParts, setCustomBodyParts] = useState("");
  const [customEquipment, setCustomEquipment] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);

  const searchExercises = async (searchValues: ExerciseSearchValues, page: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<ExerciseCatalogResponse>("/routines/exercise-catalog", {
        params: {
          q: searchValues.query,
          bodyPart: searchValues.bodyPart,
          equipment: searchValues.equipment,
          page,
          take: EXERCISE_PAGE_SIZE,
        },
      });
      setItems(response.data.items);
      setTotal(response.data.total);
      setCurrentPage(response.data.page);
      setTotalPages(response.data.totalPages);
    } catch {
      setItems([]);
      setTotal(0);
      setCurrentPage(1);
      setTotalPages(0);
      setError("운동 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setQuery("");
    setBodyPart("");
    setEquipment("");
    setIsCustomOpen(false);
    setCustomName("");
    setCustomBodyParts("");
    setCustomEquipment("");
    setCustomError(null);
    setError(null);
    setAppliedSearchValues(emptySearchValues);
    setCurrentPage(1);
    setTotalPages(0);

    const loadDialogData = async () => {
      setIsLoading(true);

      try {
        const [filterResponse, catalogResponse] = await Promise.all([
          api.get<ExerciseCatalogFilters>("/routines/exercise-catalog/filters"),
          api.get<ExerciseCatalogResponse>("/routines/exercise-catalog", {
            params: { page: 1, take: EXERCISE_PAGE_SIZE },
          }),
        ]);
        setFilters(filterResponse.data);
        setItems(catalogResponse.data.items);
        setTotal(catalogResponse.data.total);
        setCurrentPage(catalogResponse.data.page);
        setTotalPages(catalogResponse.data.totalPages);
      } catch {
        setFilters(emptyFilters);
        setItems([]);
        setTotal(0);
        setCurrentPage(1);
        setTotalPages(0);
        setError("운동 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setIsLoading(false);
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    };

    void loadDialogData();
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSearchValues = { query: query.trim(), bodyPart, equipment };
    setAppliedSearchValues(nextSearchValues);
    void searchExercises(nextSearchValues, 1);
  };

  const resetFilters = () => {
    setQuery("");
    setBodyPart("");
    setEquipment("");
    setAppliedSearchValues(emptySearchValues);
    void searchExercises(emptySearchValues, 1);
  };

  const changePage = (page: number) => {
    void searchExercises(appliedSearchValues, page);
  };

  const submitCustomExercise = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = customName.trim();
    const bodyParts = customBodyParts
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (!name) {
      setCustomError("운동명을 입력해 주세요.");
      return;
    }

    if (bodyParts.length === 0) {
      setCustomError("운동 부위를 한 개 이상 입력해 주세요.");
      return;
    }

    onSelect({
      name,
      bodyParts,
      equipment: customEquipment.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-search-dialog-title"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="exercise-search-dialog-title" className="text-lg font-bold text-slate-950">
              {dayLabel}요일 운동 추가
            </h2>
            <p className="mt-1 text-sm text-slate-500">운동을 검색하거나 직접 입력해 주세요.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            aria-label="운동 검색 창 닫기"
          >
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <form onSubmit={submitSearch} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_140px_auto]">
              <div>
                <label htmlFor="exercise-query" className="sr-only">운동명</label>
                <input
                  ref={searchInputRef}
                  id="exercise-query"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="input-style"
                  placeholder="운동명 검색"
                  maxLength={60}
                />
              </div>
              <div>
                <label htmlFor="exercise-body-part" className="sr-only">운동 부위</label>
                <select
                  id="exercise-body-part"
                  value={bodyPart}
                  onChange={(event) => setBodyPart(event.target.value)}
                  className="input-style"
                >
                  <option value="">전체 부위</option>
                  {filters.bodyParts.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="exercise-equipment" className="sr-only">운동 기구</label>
                <select
                  id="exercise-equipment"
                  value={equipment}
                  onChange={(event) => setEquipment(event.target.value)}
                  className="input-style"
                >
                  <option value="">전체 기구</option>
                  {filters.equipments.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                aria-label="운동 검색"
                className="inline-flex h-10 w-10 items-center justify-center rounded bg-slate-950 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">검색 결과 {total}건</p>
              <button type="button" onClick={resetFilters} className="text-xs font-semibold text-slate-600 hover:text-emerald-700">
                검색 조건 초기화
              </button>
            </div>
          </form>

          {error && (
            <p role="alert" className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-4 overflow-hidden rounded border border-slate-200">
            {isLoading ? (
              <p role="status" className="px-4 py-8 text-center text-sm text-slate-500">운동을 불러오는 중입니다.</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">조건에 맞는 운동이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(item)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-emerald-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900">{item.name}</span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {item.bodyParts.join(", ")} · {item.equipment ?? "기구 없음"}
                        </span>
                      </span>
                      <span className="shrink-0 rounded border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        선택
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!error && total > 0 && (
            <div className="mt-4 flex justify-center overflow-x-auto pb-1">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                disabled={isLoading}
                ariaLabel="운동 검색 결과 페이지"
                onPageChange={changePage}
              />
            </div>
          )}

          <section className="mt-5 rounded border border-dashed border-slate-300 p-4">
            <button
              type="button"
              onClick={() => {
                setIsCustomOpen((value) => !value);
                setCustomError(null);
              }}
              aria-expanded={isCustomOpen}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span>
                <span className="block text-sm font-semibold text-slate-900">원하는 운동이 없나요?</span>
                <span className="mt-1 block text-xs text-slate-500">
                  운동명, 부위, 기구를 직접 입력할 수 있으며 현재 루틴에만 추가됩니다.
                </span>
              </span>
              <span className="text-sm font-semibold text-emerald-700">{isCustomOpen ? "닫기" : "직접 입력"}</span>
            </button>

            {isCustomOpen && (
              <form onSubmit={submitCustomExercise} className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                {customError && <p role="alert" className="text-sm text-red-700">{customError}</p>}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor="custom-exercise-name" className="mb-1 block text-xs font-semibold text-slate-700">운동명</label>
                    <input
                      id="custom-exercise-name"
                      value={customName}
                      onChange={(event) => setCustomName(event.target.value)}
                      className="input-style"
                      placeholder="예: 케이블 풀오버"
                      maxLength={60}
                    />
                  </div>
                  <div>
                    <label htmlFor="custom-exercise-body" className="mb-1 block text-xs font-semibold text-slate-700">운동 부위</label>
                    <input
                      id="custom-exercise-body"
                      value={customBodyParts}
                      onChange={(event) => setCustomBodyParts(event.target.value)}
                      className="input-style"
                      placeholder="등, 광배근"
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label htmlFor="custom-exercise-equipment" className="mb-1 block text-xs font-semibold text-slate-700">운동 기구</label>
                    <input
                      id="custom-exercise-equipment"
                      value={customEquipment}
                      onChange={(event) => setCustomEquipment(event.target.value)}
                      className="input-style"
                      placeholder="예: 케이블"
                      maxLength={60}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
                    직접 입력 운동 추가
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>

        <footer className="flex justify-end border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
            취소
          </button>
        </footer>
      </section>
    </div>
  );
}
