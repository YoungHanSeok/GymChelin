export const routineDayOrder = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export type RoutineDayOfWeek = (typeof routineDayOrder)[number];

export const routineDayLabel: Record<RoutineDayOfWeek, string> = {
  MONDAY: "월",
  TUESDAY: "화",
  WEDNESDAY: "수",
  THURSDAY: "목",
  FRIDAY: "금",
  SATURDAY: "토",
  SUNDAY: "일",
};

export type ApiRoutineAuthor = {
  id?: number | null;
  nickname?: string | null;
  username?: string | null;
};

export type ApiRoutineSet = {
  id: number;
  sortOrder: number;
  weightKg: number | string;
  repetitions: number | null;
  durationMinutes: number | null;
};

export type ApiRoutineExercise = {
  id: number;
  exerciseWikiId: number | null;
  exerciseName: string;
  bodyParts: string[];
  equipment: string | null;
  sortOrder: number;
  sets: ApiRoutineSet[];
};

export type ApiRoutineDay = {
  id?: number;
  dayOfWeek: RoutineDayOfWeek;
  sortOrder: number;
  exercises?: ApiRoutineExercise[];
  _count?: {
    exercises?: number;
  };
};

export type ApiRoutineComment = {
  id: number;
  content: string;
  status?: "ACTIVE" | "BLINDED" | "DELETED";
  isDeleted?: boolean;
  routineId: number;
  parentId?: number | null;
  author?: ApiRoutineAuthor | null;
  createdAt: string;
  updatedAt?: string;
  replies?: ApiRoutineComment[];
};

export type ApiRoutine = {
  id: number;
  publicCode: string;
  title: string;
  summary?: string | null;
  content?: string | null;
  tags?: string[];
  status?: "ACTIVE" | "BLINDED" | "DELETED";
  likeCount?: number;
  viewCount?: number;
  liked?: boolean;
  authorId?: number;
  author?: ApiRoutineAuthor | null;
  createdAt: string;
  updatedAt?: string;
  days: ApiRoutineDay[];
  comments?: ApiRoutineComment[];
  _count?: {
    likes?: number;
    comments?: number;
  };
};

export type RoutineLikeResponse = {
  liked: boolean;
  likeCount: number;
};
