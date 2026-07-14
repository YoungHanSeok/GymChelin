"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import MarkdownEditor, { type MarkdownEditorHandle } from "@/components/community/MarkdownEditor";
import api from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import { toPlainTextPreview } from "@/lib/community-types";
import ExerciseSearchDialog from "./ExerciseSearchDialog";
import RoutineImportDialog from "./RoutineImportDialog";
import {
  routineDayOptions,
  type ExerciseCatalogItem,
  type RoutineDayDraft,
  type RoutineImportResult,
} from "./routine-form-types";

const nullablePositiveInteger = z.number().int("정수로 입력해 주세요.").positive("1 이상 입력해 주세요.").nullable();

const routineSetSchema = z
  .object({
    clientId: z.string(),
    weightKg: z.number().int("무게는 1kg 단위의 정수로 입력해 주세요.").min(0, "무게는 0kg 이상이어야 합니다."),
    repetitions: nullablePositiveInteger,
    durationMinutes: nullablePositiveInteger,
  })
  .refine((set) => set.repetitions !== null || set.durationMinutes !== null, {
    message: "반복횟수 또는 운동시간 중 한 가지 이상 입력해 주세요.",
  });

const routineExerciseSchema = z.object({
  clientId: z.string(),
  exerciseWikiId: z.number().int().positive().nullable(),
  exerciseName: z.string().trim().min(1),
  bodyParts: z.array(z.string().trim().min(1)).min(1),
  equipment: z.string().trim().nullable(),
  sets: z.array(routineSetSchema).min(1, "운동마다 한 개 이상의 세트가 필요합니다."),
});

const routineDaySchema = z
  .object({
    dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
    selected: z.boolean(),
    exercises: z.array(routineExerciseSchema),
  })
  .refine((day) => !day.selected || day.exercises.length > 0, {
    message: "선택한 요일에는 한 개 이상의 운동이 필요합니다.",
    path: ["exercises"],
  });

const isValidTagInput = (value: string) => {
  if (!value.trim()) {
    return true;
  }

  const tags = value
    .split(",")
    .map((tag) => tag.trim());

  return tags.length <= 10 && tags.every((tag) => /^#[가-힣A-Za-z0-9_]{1,30}$/.test(tag));
};

const routineWriteSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(180, "제목은 최대 180자까지 입력할 수 있습니다."),
  tagInput: z.string().refine(isValidTagInput, {
    message: "태그는 #운동, #하체처럼 작성해 콤마로 구분하고 최대 10개까지 입력해 주세요.",
  }),
  days: z.array(routineDaySchema).refine((days) => days.some((day) => day.selected), {
    message: "운동 요일을 한 개 이상 선택해 주세요.",
  }),
});

type RoutineWriteValues = z.infer<typeof routineWriteSchema>;

const createDefaultDays = (): RoutineDayDraft[] =>
  routineDayOptions.map((day, index) => ({
    dayOfWeek: day.value,
    selected: index === 0,
    exercises: [],
  }));

const parseTags = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter(Boolean);

type CreatedRoutineResponse = {
  id: number;
};

function CancelWriteDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-routine-dialog-title"
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <h2 id="cancel-routine-dialog-title" className="text-base font-bold text-slate-950">루틴 작성을 취소할까요?</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">작성 중인 제목, 소개, 태그와 요일별 루틴이 모두 사라집니다.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
            계속 작성
          </button>
          <button type="button" onClick={onConfirm} className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            작성 취소
          </button>
        </div>
      </section>
    </div>
  );
}

export default function RoutineWriteForm() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthSession();
  const editorRef = useRef<MarkdownEditorHandle | null>(null);
  const redirectTimerRef = useRef<number | null>(null);
  const clientIdRef = useRef(0);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<RoutineWriteValues>({
    resolver: zodResolver(routineWriteSchema),
    defaultValues: {
      title: "",
      tagInput: "",
      days: createDefaultDays(),
    },
    mode: "onSubmit",
  });

  const days = useWatch({ control, name: "days" }) ?? createDefaultDays();
  const activeDay = days[activeDayIndex] ?? days[0];
  const activeDayOption = routineDayOptions[activeDayIndex] ?? routineDayOptions[0];

  const createClientId = (prefix: string) => {
    clientIdRef.current += 1;
    return `${prefix}-${Date.now()}-${clientIdRef.current}`;
  };

  useEffect(() => {
    if (isAuthLoading || user) {
      if (user) {
        setAuthNotice(null);
      }

      return;
    }

    setAuthNotice("로그인이 필요합니다. 로그인 페이지로 이동합니다.");
    redirectTimerRef.current = window.setTimeout(() => {
      router.push(`/login?redirect=${encodeURIComponent("/routines/write")}`);
    }, 900);

    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [isAuthLoading, router, user]);

  const setDays = (nextDays: RoutineDayDraft[], shouldValidate = false) => {
    setValue("days", nextDays, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate,
    });
  };

  const selectDayTab = (dayIndex: number) => {
    const nextDays = [...getValues("days")];
    const targetDay = nextDays[dayIndex];

    if (!targetDay) {
      return;
    }

    if (!targetDay.selected) {
      nextDays[dayIndex] = { ...targetDay, selected: true };
      setDays(nextDays);
    }

    setActiveDayIndex(dayIndex);
  };

  const excludeActiveDay = () => {
    const nextDays = [...getValues("days")];
    nextDays[activeDayIndex] = {
      ...nextDays[activeDayIndex],
      selected: false,
      exercises: [],
    };
    setDays(nextDays, submitCount > 0);

    const nextSelectedIndex = nextDays.findIndex((day) => day.selected);
    if (nextSelectedIndex >= 0) {
      setActiveDayIndex(nextSelectedIndex);
    }
  };

  const addExercise = (exercise: ExerciseCatalogItem | Omit<ExerciseCatalogItem, "id">) => {
    const nextDays = [...getValues("days")];
    const targetDay = nextDays[activeDayIndex];

    if (!targetDay) {
      return;
    }

    const nextExercise = {
      clientId: createClientId("exercise"),
      exerciseWikiId: "id" in exercise ? exercise.id : null,
      exerciseName: exercise.name,
      bodyParts: [...exercise.bodyParts],
      equipment: exercise.equipment,
      sets: [
        {
          clientId: createClientId("set"),
          weightKg: 0,
          repetitions: null,
          durationMinutes: null,
        },
      ],
    };

    nextDays[activeDayIndex] = {
      ...targetDay,
      selected: true,
      exercises: [...targetDay.exercises, nextExercise],
    };
    setDays(nextDays, submitCount > 0);
    setIsExerciseDialogOpen(false);
  };

  const removeExercise = (exerciseIndex: number) => {
    const nextDays = [...getValues("days")];
    const targetDay = nextDays[activeDayIndex];
    nextDays[activeDayIndex] = {
      ...targetDay,
      exercises: targetDay.exercises.filter((_, index) => index !== exerciseIndex),
    };
    setDays(nextDays, submitCount > 0);
  };

  const addSet = (exerciseIndex: number) => {
    const nextDays = [...getValues("days")];
    const targetDay = nextDays[activeDayIndex];
    const nextExercises = [...targetDay.exercises];
    const targetExercise = nextExercises[exerciseIndex];
    nextExercises[exerciseIndex] = {
      ...targetExercise,
      sets: [
        ...targetExercise.sets,
        {
          clientId: createClientId("set"),
          weightKg: 0,
          repetitions: null,
          durationMinutes: null,
        },
      ],
    };
    nextDays[activeDayIndex] = { ...targetDay, exercises: nextExercises };
    setDays(nextDays, submitCount > 0);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const nextDays = [...getValues("days")];
    const targetDay = nextDays[activeDayIndex];
    const nextExercises = [...targetDay.exercises];
    const targetExercise = nextExercises[exerciseIndex];

    if (targetExercise.sets.length <= 1) {
      return;
    }

    nextExercises[exerciseIndex] = {
      ...targetExercise,
      sets: targetExercise.sets.filter((_, index) => index !== setIndex),
    };
    nextDays[activeDayIndex] = { ...targetDay, exercises: nextExercises };
    setDays(nextDays, submitCount > 0);
  };

  const importRoutine = (routine: RoutineImportResult) => {
    const importedDays: RoutineDayDraft[] = routineDayOptions.map((option) => {
      const importedDay = routine.days.find((day) => day.dayOfWeek === option.value);

      return {
        dayOfWeek: option.value,
        selected: Boolean(importedDay),
        exercises:
          importedDay?.exercises.map((exercise) => ({
            clientId: createClientId("exercise"),
            exerciseWikiId: exercise.exerciseWikiId,
            exerciseName: exercise.exerciseName,
            bodyParts: [...exercise.bodyParts],
            equipment: exercise.equipment,
            sets: exercise.sets.map((set) => ({
              clientId: createClientId("set"),
              weightKg: set.weightKg,
              repetitions: set.repetitions,
              durationMinutes: set.durationMinutes,
            })),
          })) ?? [],
      };
    });

    setDays(importedDays, true);
    const firstSelectedIndex = importedDays.findIndex((day) => day.selected);
    setActiveDayIndex(firstSelectedIndex >= 0 ? firstSelectedIndex : 0);
    setIsImportDialogOpen(false);
    setSubmitError(null);
  };

  const submitRoutine = async (values: RoutineWriteValues) => {
    setSubmitError(null);
    const content = editorRef.current?.getMarkdown().trim() ?? "";
    const tags = parseTags(values.tagInput);

    try {
      const response = await api.post<CreatedRoutineResponse>("/routines", {
        title: values.title.trim(),
        content: content || undefined,
        summary: content ? toPlainTextPreview(content) : undefined,
        tags,
        days: values.days
          .filter((day) => day.selected)
          .map((day) => ({
            dayOfWeek: day.dayOfWeek,
            exercises: day.exercises.map((exercise) => ({
              exerciseWikiId: exercise.exerciseWikiId ?? undefined,
              exerciseName: exercise.exerciseName,
              bodyParts: exercise.bodyParts,
              equipment: exercise.equipment ?? undefined,
              sets: exercise.sets.map((set) => ({
                weightKg: set.weightKg,
                repetitions: set.repetitions ?? undefined,
                durationMinutes: set.durationMinutes ?? undefined,
              })),
            })),
          })),
      });

      editorRef.current?.destroy();
      router.push(`/routines/${response.data.id}`);
      router.refresh();
    } catch {
      setSubmitError("루틴을 저장하지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.");
    }
  };

  const invalidRoutine = () => {
    setSubmitError("입력하지 않은 필수 항목이 있습니다. 표시된 내용을 확인해 주세요.");
  };

  if (isAuthLoading || !user) {
    return (
      <p role="status" className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        {isAuthLoading ? "로그인 상태를 확인하는 중입니다." : authNotice ?? "로그인이 필요합니다."}
      </p>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit(submitRoutine, invalidRoutine)} className="space-y-7" noValidate>
        {submitError && (
          <p role="alert" className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </p>
        )}

        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <div>
            <label htmlFor="routine-title" className="mb-1.5 block text-sm font-semibold text-slate-700">
              제목 <span className="text-red-600">*</span>
            </label>
            <input
              id="routine-title"
              {...register("title")}
              className="input-style"
              placeholder="루틴의 특징이 드러나는 제목을 입력해 주세요"
              maxLength={180}
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title && <p className="mt-1.5 text-sm text-red-700">{errors.title.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">소개 <span className="font-normal text-slate-400">(선택)</span></label>
            <MarkdownEditor ref={editorRef} height="300px" placeholder="루틴의 목표, 수행 팁 등을 자유롭게 소개해 주세요." />
          </div>

          <div>
            <label htmlFor="routine-tags" className="mb-1.5 block text-sm font-semibold text-slate-700">태그 <span className="font-normal text-slate-400">(선택)</span></label>
            <input
              id="routine-tags"
              {...register("tagInput")}
              className="input-style"
              placeholder="#근비대, #주4회 처럼 콤마로 구분해 주세요"
              aria-invalid={Boolean(errors.tagInput)}
            />
            {errors.tagInput && <p className="mt-1.5 text-sm text-red-700">{errors.tagInput.message}</p>}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">요일별 루틴</h2>
              <p className="mt-1 text-sm text-slate-500">운동 요일을 선택하고 각 요일에 운동과 세트를 등록해 주세요.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsImportDialogOpen(true)}
              className="rounded border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              루틴 가져오기
            </button>
          </header>

          <div className="border-b border-slate-200 px-3 pt-3 sm:px-5">
            <div role="tablist" aria-label="운동 요일" className="grid grid-cols-7 gap-1">
              {routineDayOptions.map((option, dayIndex) => {
                const day = days[dayIndex];
                const isActive = dayIndex === activeDayIndex;
                const isSelected = Boolean(day?.selected);

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => selectDayTab(dayIndex)}
                    className={`relative rounded-t px-2 py-3 text-sm font-bold transition ${
                      isActive
                        ? "border border-b-white border-slate-300 bg-white text-emerald-700"
                        : isSelected
                          ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {option.label}
                    {isSelected && (
                      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-label="선택됨" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div role="tabpanel" className="space-y-4 px-4 py-5 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-950">{activeDayOption.label}요일 운동</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {activeDay?.selected ? `${activeDay.exercises.length}개 운동이 등록되었습니다.` : "이 요일은 선택되지 않았습니다."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeDay?.selected && (
                  <button
                    type="button"
                    onClick={excludeActiveDay}
                    className="rounded border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:border-red-400"
                  >
                    이 요일 제외
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!activeDay?.selected) {
                      selectDayTab(activeDayIndex);
                    }
                    setIsExerciseDialogOpen(true);
                  }}
                  className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  운동 추가
                </button>
              </div>
            </div>

            {submitCount > 0 && activeDay?.selected && activeDay.exercises.length === 0 && (
              <p role="alert" className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                선택한 요일에는 한 개 이상의 운동을 등록해 주세요.
              </p>
            )}

            {!activeDay?.selected ? (
              <button
                type="button"
                onClick={() => selectDayTab(activeDayIndex)}
                className="w-full rounded border border-dashed border-slate-300 px-4 py-10 text-sm font-semibold text-slate-500 hover:border-emerald-500 hover:text-emerald-700"
              >
                {activeDayOption.label}요일을 운동일로 선택
              </button>
            ) : activeDay.exercises.length === 0 ? (
              <button
                type="button"
                onClick={() => setIsExerciseDialogOpen(true)}
                className="w-full rounded border border-dashed border-slate-300 px-4 py-10 text-sm font-semibold text-slate-500 hover:border-emerald-500 hover:text-emerald-700"
              >
                등록된 운동이 없습니다. 운동을 추가해 주세요.
              </button>
            ) : (
              <div className="space-y-4">
                {activeDay.exercises.map((exercise, exerciseIndex) => (
                  <article key={exercise.clientId} className="overflow-hidden rounded border border-slate-200">
                    <header className="flex items-start justify-between gap-4 bg-slate-50 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-slate-950">{exercise.exerciseName}</h4>
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">{exercise.sets.length}세트</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {exercise.bodyParts.join(", ")} · {exercise.equipment ?? "기구 없음"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExercise(exerciseIndex)}
                        className="shrink-0 text-xs font-semibold text-red-700 hover:text-red-900"
                      >
                        운동 삭제
                      </button>
                    </header>

                    <div className="px-3 py-4 sm:px-4">
                      <div className="hidden grid-cols-[52px_minmax(90px,1fr)_minmax(90px,1fr)_minmax(110px,1fr)_64px] gap-2 px-2 pb-2 text-xs font-semibold text-slate-500 sm:grid">
                        <span>세트</span>
                        <span>무게(kg)</span>
                        <span>반복횟수</span>
                        <span>운동시간(분)</span>
                        <span className="sr-only">삭제</span>
                      </div>

                      <div className="space-y-2">
                        {exercise.sets.map((set, setIndex) => {
                          const setError = errors.days?.[activeDayIndex]?.exercises?.[exerciseIndex]?.sets?.[setIndex];
                          const needsRepetitionOrTime = submitCount > 0 && set.repetitions === null && set.durationMinutes === null;

                          return (
                            <div key={set.clientId} className="rounded border border-slate-200 p-3 sm:border-0 sm:p-0">
                              <div className="grid gap-3 sm:grid-cols-[52px_minmax(90px,1fr)_minmax(90px,1fr)_minmax(110px,1fr)_64px] sm:items-start sm:gap-2">
                                <div className="flex h-10 items-center text-sm font-bold text-slate-700">{setIndex + 1}세트</div>
                                <label className="text-xs font-semibold text-slate-600 sm:text-[0px]">
                                  무게(kg)
                                  <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    inputMode="numeric"
                                    {...register(`days.${activeDayIndex}.exercises.${exerciseIndex}.sets.${setIndex}.weightKg`, {
                                      setValueAs: (value) => (value === "" ? Number.NaN : Number(value)),
                                    })}
                                    className="input-style mt-1 sm:mt-0 sm:text-sm"
                                    aria-label={`${exercise.exerciseName} ${setIndex + 1}세트 무게(kg)`}
                                  />
                                </label>
                                <label className="text-xs font-semibold text-slate-600 sm:text-[0px]">
                                  반복횟수
                                  <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    inputMode="numeric"
                                    {...register(`days.${activeDayIndex}.exercises.${exerciseIndex}.sets.${setIndex}.repetitions`, {
                                      setValueAs: (value) => (value === "" ? null : Number(value)),
                                    })}
                                    className="input-style mt-1 sm:mt-0 sm:text-sm"
                                    placeholder="선택"
                                    aria-label={`${exercise.exerciseName} ${setIndex + 1}세트 반복횟수`}
                                  />
                                </label>
                                <label className="text-xs font-semibold text-slate-600 sm:text-[0px]">
                                  운동시간(분)
                                  <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    inputMode="numeric"
                                    {...register(`days.${activeDayIndex}.exercises.${exerciseIndex}.sets.${setIndex}.durationMinutes`, {
                                      setValueAs: (value) => (value === "" ? null : Number(value)),
                                    })}
                                    className="input-style mt-1 sm:mt-0 sm:text-sm"
                                    placeholder="선택"
                                    aria-label={`${exercise.exerciseName} ${setIndex + 1}세트 운동시간(분)`}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeSet(exerciseIndex, setIndex)}
                                  disabled={exercise.sets.length <= 1}
                                  className="h-10 rounded border border-slate-300 px-2 text-xs font-semibold text-slate-600 hover:border-red-400 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  삭제
                                </button>
                              </div>
                              {(setError?.weightKg?.message || setError?.repetitions?.message || setError?.durationMinutes?.message || needsRepetitionOrTime) && (
                                <p className="mt-1.5 text-xs text-red-700">
                                  {setError?.weightKg?.message ??
                                    setError?.repetitions?.message ??
                                    setError?.durationMinutes?.message ??
                                    "반복횟수 또는 운동시간을 한 가지 이상 입력해 주세요."}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => addSet(exerciseIndex)}
                        className="mt-3 w-full rounded border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-emerald-500 hover:text-emerald-700"
                      >
                        + 세트 추가
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {submitCount > 0 && !days.some((day) => day.selected) && (
              <p role="alert" className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                운동 요일을 한 개 이상 선택해 주세요.
              </p>
            )}
          </div>
        </section>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsCancelDialogOpen(true)}
            disabled={isSubmitting}
            className="rounded border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "저장 중" : "루틴 게시하기"}
          </button>
        </div>
      </form>

      <ExerciseSearchDialog
        dayLabel={activeDayOption.label}
        isOpen={isExerciseDialogOpen}
        onClose={() => setIsExerciseDialogOpen(false)}
        onSelect={addExercise}
      />
      <RoutineImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onImport={importRoutine}
      />
      {isCancelDialogOpen && (
        <CancelWriteDialog
          onClose={() => setIsCancelDialogOpen(false)}
          onConfirm={() => {
            editorRef.current?.destroy();
            router.push("/routines");
          }}
        />
      )}
    </>
  );
}
