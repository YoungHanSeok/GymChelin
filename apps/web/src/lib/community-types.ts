export type PostCategory = "FREE" | "WORKOUT_LOG";

export type PostPreview = {
  id: number;
  category: PostCategory;
  title: string;
  excerpt: string;
  author: string;
  createdAt: string;
  viewCount: number;
  commentCount: number;
  likeCount: number;
};

export type RoutinePreview = {
  id: number;
  title: string;
  summary: string;
  author: string;
  likeCount: number;
  createdAt: string;
};

export type GymPreview = {
  providerPlaceId: string;
  name: string;
  addressName: string;
  avgRating: number;
  reviewCount: number;
  externalRating?: number | null;
  placeUrl?: string | null;
};

export type WikiPreview = {
  slug: string;
  name: string;
  targetMuscles: string[];
  equipment: string;
  difficulty: string;
  description: string;
};

export type ApiAuthor = {
  id?: number | null;
  nickname?: string | null;
  username?: string | null;
};

export type ApiPost = {
  id: number;
  category: PostCategory;
  title: string;
  content: string;
  createdAt: string;
  viewCount: number;
  author?: ApiAuthor | null;
  comments?: ApiComment[];
  _count?: {
    comments?: number;
    reactions?: number;
  };
};

export type ApiComment = {
  id: number;
  content: string;
  status?: "ACTIVE" | "BLINDED" | "DELETED";
  isDeleted?: boolean;
  parentId?: number | null;
  createdAt: string;
  updatedAt?: string;
  likeCount?: number;
  dislikeCount?: number;
  author?: ApiAuthor | null;
  replies?: ApiComment[];
};

export type ApiRoutine = {
  id: number;
  title: string;
  summary?: string | null;
  content?: string | null;
  createdAt: string;
  likeCount?: number;
  author?: ApiAuthor | null;
  _count?: {
    likes?: number;
  };
};

export type ApiWiki = {
  slug: string;
  name: string;
  targetMuscles?: string[];
  equipment?: string | null;
  difficulty?: string | null;
  description: string;
};

export type ApiGymReview = {
  id: number;
  rating: number;
  content: string;
  createdAt: string;
  user?: ApiAuthor | null;
};

export type ApiGym = GymPreview & {
  roadAddressName?: string | null;
  phone?: string | null;
  reviews?: ApiGymReview[];
};

export const formatDateLabel = (value?: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatRelativeDateLabel = (value?: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();

  if (Number.isNaN(date.getTime()) || diffMs < 0) {
    return "";
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return "방금전";
  }

  if (diffMs < hour) {
    return `약 ${Math.floor(diffMs / minute)}분전`;
  }

  if (diffMs < day) {
    return `약 ${Math.floor(diffMs / hour)}시간전`;
  }

  return `${Math.floor(diffMs / day)}일전`;
};

export const authorName = (author?: ApiAuthor | null) => author?.nickname || author?.username || "익명";

export const toPostPreview = (post: ApiPost): PostPreview => ({
  id: post.id,
  category: post.category,
  title: post.title,
  excerpt: post.content.slice(0, 120),
  author: authorName(post.author),
  createdAt: formatRelativeDateLabel(post.createdAt),
  viewCount: post.viewCount,
  commentCount: post._count?.comments ?? 0,
  likeCount: post._count?.reactions ?? 0,
});

export const toRoutinePreview = (routine: ApiRoutine): RoutinePreview => ({
  id: routine.id,
  title: routine.title,
  summary: routine.summary || routine.content?.slice(0, 120) || "",
  author: authorName(routine.author),
  likeCount: routine.likeCount ?? routine._count?.likes ?? 0,
  createdAt: formatDateLabel(routine.createdAt),
});

export const toWikiPreview = (wiki: ApiWiki): WikiPreview => ({
  slug: wiki.slug,
  name: wiki.name,
  targetMuscles: wiki.targetMuscles ?? [],
  equipment: wiki.equipment || "미정",
  difficulty: wiki.difficulty || "미정",
  description: wiki.description,
});
