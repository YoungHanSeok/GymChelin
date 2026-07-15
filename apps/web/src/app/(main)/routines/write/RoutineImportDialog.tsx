"use client";

// 기존 루틴을 검색해 새 루틴 폼으로 가져오는 대화상자다.
import { FormEvent, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import api from "@/lib/api";
import { routineDayOptions, type RoutineImportResult } from "./routine-form-types";

type RoutineImportDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onImport: (routine: RoutineImportResult) => void;
};

const getDayLabel = (dayOfWeek: RoutineImportResult["days"][number]["dayOfWeek"]) =>
  routineDayOptions.find((option) => option.value === dayOfWeek)?.label ?? dayOfWeek;

export default function RoutineImportDialog({ isOpen, onClose, onImport }: RoutineImportDialogProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [publicCode, setPublicCode] = useState("");
  const [result, setResult] = useState<RoutineImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setPublicCode("");
    setResult(null);
    setError(null);
    setIsConfirming(false);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const searchRoutine = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCode = publicCode.trim().toUpperCase();

    if (!normalizedCode) {
      setError("루틴 고유코드를 입력해 주세요.");
      return;
    }

    setPublicCode(normalizedCode);
    setIsLoading(true);
    setError(null);
    setResult(null);
    setIsConfirming(false);

    try {
      const response = await api.get<RoutineImportResult>(`/routines/import/${encodeURIComponent(normalizedCode)}`);
      setResult(response.data);
    } catch (requestError) {
      if (isAxiosError(requestError) && requestError.response?.status === 404) {
        setError("해당 고유코드의 루틴을 찾지 못했습니다.");
      } else {
        setError("루틴을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const confirmImport = () => {
    if (!result) {
      return;
    }

    onImport(result);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="routine-import-dialog-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="routine-import-dialog-title" className="text-lg font-bold text-slate-950">루틴 가져오기</h2>
            <p className="mt-1 text-sm text-slate-500">공개된 루틴의 고유코드로 요일별 운동을 가져옵니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="루틴 가져오기 창 닫기"
            className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
          >
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {isConfirming && result ? (
            <div className="rounded border border-amber-300 bg-amber-50 p-5">
              <h3 className="text-base font-bold text-amber-950">요일별 루틴을 덮어쓸까요?</h3>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                현재 작성한 요일, 운동, 세트 데이터는 모두 사라지고 가져온 루틴으로 바뀝니다.
                작성 중인 제목, 소개, 태그는 그대로 유지됩니다.
              </p>
              <dl className="mt-4 grid grid-cols-[90px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
                <dt className="font-semibold text-amber-900">고유코드</dt>
                <dd className="font-mono text-amber-950">{result.publicCode}</dd>
                <dt className="font-semibold text-amber-900">루틴 제목</dt>
                <dd className="text-amber-950">{result.title}</dd>
              </dl>
            </div>
          ) : (
            <>
              <form onSubmit={searchRoutine} className="flex flex-col gap-3 sm:flex-row">
                <div className="min-w-0 flex-1">
                  <label htmlFor="routine-public-code" className="mb-1.5 block text-sm font-semibold text-slate-700">
                    루틴 고유코드
                  </label>
                  <input
                    ref={inputRef}
                    id="routine-public-code"
                    value={publicCode}
                    onChange={(event) => setPublicCode(event.target.value.toUpperCase())}
                    className="input-style font-mono uppercase"
                    placeholder="RT-A1B2C3D4"
                    maxLength={20}
                    autoComplete="off"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-auto rounded bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isLoading ? "검색 중" : "검색"}
                </button>
              </form>

              {error && (
                <p role="alert" className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              {result && (
                <section className="mt-5 overflow-hidden rounded border border-slate-200">
                  <header className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-950">{result.title}</h3>
                      <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-xs font-semibold text-white">
                        {result.publicCode}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {result.days.length}개 운동일 · {result.days.reduce((sum, day) => sum + day.exercises.length, 0)}개 운동
                    </p>
                  </header>

                  <div className="divide-y divide-slate-100">
                    {result.days.map((day) => (
                      <div key={day.dayOfWeek} className="px-4 py-3">
                        <p className="text-sm font-bold text-emerald-700">{getDayLabel(day.dayOfWeek)}요일</p>
                        <ul className="mt-2 space-y-2">
                          {day.exercises.map((exercise, exerciseIndex) => (
                            <li key={`${day.dayOfWeek}-${exerciseIndex}`} className="text-sm text-slate-700">
                              <span className="font-semibold text-slate-900">{exercise.exerciseName}</span>
                              <span className="ml-2 text-xs text-slate-500">
                                {exercise.bodyParts.join(", ")} · {exercise.equipment ?? "기구 없음"} · {exercise.sets.length}세트
                                {exercise.durationMinutes ? ` · 총 ${exercise.durationMinutes}분` : ""}
                              </span>
                              {exercise.exerciseReason && (
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                  운동 이유: {exercise.exerciseReason}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={isConfirming ? () => setIsConfirming(false) : onClose}
            disabled={isLoading}
            className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isConfirming ? "돌아가기" : "취소"}
          </button>
          {result && (
            <button
              type="button"
              onClick={isConfirming ? confirmImport : () => setIsConfirming(true)}
              className={`rounded px-4 py-2 text-sm font-semibold text-white ${
                isConfirming ? "bg-amber-700 hover:bg-amber-800" : "bg-emerald-700 hover:bg-emerald-800"
              }`}
            >
              {isConfirming ? "덮어쓰고 복제하기" : "복제하기"}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
