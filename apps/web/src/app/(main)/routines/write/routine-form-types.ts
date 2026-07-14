export const routineDayOptions = [
  { value: "MONDAY", label: "월" },
  { value: "TUESDAY", label: "화" },
  { value: "WEDNESDAY", label: "수" },
  { value: "THURSDAY", label: "목" },
  { value: "FRIDAY", label: "금" },
  { value: "SATURDAY", label: "토" },
  { value: "SUNDAY", label: "일" },
] as const;

export type RoutineDayOfWeek = (typeof routineDayOptions)[number]["value"];

export type RoutineSetDraft = {
  clientId: string;
  weightKg: number;
  repetitions: number | null;
};

export type RoutineExerciseDraft = {
  clientId: string;
  exerciseCatalogId: number | null;
  exerciseName: string;
  bodyParts: string[];
  equipment: string | null;
  durationMinutes: number | null;
  exerciseReason: string;
  sets: RoutineSetDraft[];
};

export type RoutineDayDraft = {
  dayOfWeek: RoutineDayOfWeek;
  selected: boolean;
  exercises: RoutineExerciseDraft[];
};

export type ExerciseCatalogItem = {
  id: number;
  name: string;
  bodyParts: string[];
  equipment: string | null;
};

export type ExerciseCatalogResponse = {
  items: ExerciseCatalogItem[];
  total: number;
};

export type ExerciseCatalogFilters = {
  bodyParts: string[];
  equipments: string[];
};

export type RoutineImportExercise = {
  exerciseCatalogId: number | null;
  exerciseName: string;
  bodyParts: string[];
  equipment: string | null;
  durationMinutes: number | null;
  exerciseReason: string | null;
  sets: Array<{
    weightKg: number;
    repetitions: number | null;
  }>;
};

export type RoutineImportResult = {
  publicCode: string;
  title: string;
  days: Array<{
    dayOfWeek: RoutineDayOfWeek;
    exercises: RoutineImportExercise[];
  }>;
};
