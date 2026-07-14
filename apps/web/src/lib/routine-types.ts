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
};

export type ApiRoutineExercise = {
  id: number;
  exerciseCatalogId: number | null;
  exerciseName: string;
  bodyParts: string[];
  equipment: string | null;
  durationMinutes: number | null;
  exerciseReason: string | null;
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

export type RoutineSortKey = "latest" | "views" | "comments" | "likes";

export type RoutineSearchType = "title" | "titleContent" | "author";

export type RoutineListQuery = {
  page: number;
  sort: RoutineSortKey;
  searchType: RoutineSearchType;
  keyword: string;
};

export type RoutineSearchParams = Record<string, string | string[] | undefined>;

export type ApiRoutineListResponse = {
  items: ApiRoutine[];
  total: number;
  page: number;
  take: number;
  totalPages: number;
};

export const ROUTINE_PAGE_SIZE = 10;

const routineSortKeys: RoutineSortKey[] = ["latest", "views", "comments", "likes"];
const routineSearchTypes: RoutineSearchType[] = ["title", "titleContent", "author"];

const firstRoutineSearchParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const parseRoutineListQuery = (searchParams: RoutineSearchParams): RoutineListQuery => {
  const pageValue = firstRoutineSearchParam(searchParams.page);
  const parsedPage = pageValue && /^\d+$/.test(pageValue) ? Number(pageValue) : 1;
  const sortValue = firstRoutineSearchParam(searchParams.sort);
  const searchTypeValue = firstRoutineSearchParam(searchParams.searchType);

  return {
    page: Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    sort: routineSortKeys.includes(sortValue as RoutineSortKey)
      ? (sortValue as RoutineSortKey)
      : "latest",
    searchType: routineSearchTypes.includes(searchTypeValue as RoutineSearchType)
      ? (searchTypeValue as RoutineSearchType)
      : "title",
    keyword: firstRoutineSearchParam(searchParams.keyword)?.trim() ?? "",
  };
};

export type RoutineLikeResponse = {
  liked: boolean;
  likeCount: number;
};
