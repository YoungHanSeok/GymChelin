import { routineDayLabel, type ApiRoutine } from "@/lib/routine-types";

export type { ApiRoutine } from "@/lib/routine-types";

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
  publicCode: string;
  title: string;
  summary: string;
  author: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  dayLabels: string[];
  exerciseCount: number;
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
  updatedAt?: string;
  viewCount: number;
  author?: ApiAuthor | null;
  comments?: ApiComment[];
  _count?: {
    comments?: number;
    reactions?: number;
    editHistories?: number;
  };
};

export type ApiPostEditHistory = {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  editor?: ApiAuthor | null;
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

const imagePreviewText = (altText?: string) => altText?.trim() || "이미지";

const findMarkdownLabelEnd = (value: string, start: number) => {
  let nestedBrackets = 0;

  for (let index = start; index < value.length; index += 1) {
    if (value[index] === "\\") {
      index += 1;
    } else if (value[index] === "[") {
      nestedBrackets += 1;
    } else if (value[index] === "]") {
      if (nestedBrackets === 0) {
        return index;
      }

      nestedBrackets -= 1;
    }
  }

  return -1;
};

const findMarkdownTargetEnd = (value: string, start: number, stopAtLineBreak = false) => {
  let nestedParentheses = 0;
  let isAngleDestination = value[start] === "<";
  let titleQuote: "\"" | "'" | null = null;

  for (let index = start; index < value.length; index += 1) {
    if (stopAtLineBreak && (value[index] === "\n" || value[index] === "\r")) {
      return -1;
    }

    if (value[index] === "\\") {
      if (stopAtLineBreak && (value[index + 1] === "\n" || value[index + 1] === "\r")) {
        return -1;
      }

      index += 1;
    } else if (isAngleDestination) {
      if (value[index] === ">") {
        isAngleDestination = false;
      }
    } else if (titleQuote) {
      if (value[index] === titleQuote) {
        titleQuote = null;
      }
    } else if (
      (value[index] === "\"" || value[index] === "'")
      && index > start
      && " \t\r\n".includes(value[index - 1])
    ) {
      titleQuote = value[index] as "\"" | "'";
    } else if (value[index] === "(") {
      nestedParentheses += 1;
    } else if (value[index] === ")") {
      if (nestedParentheses === 0) {
        return index;
      }

      nestedParentheses -= 1;
    }
  }

  return -1;
};

const isDataImageMarkdownTarget = (value: string, start: number) => {
  let prefixStart = start;

  while (prefixStart < value.length && (value[prefixStart] === " " || value[prefixStart] === "\t")) {
    prefixStart += 1;
  }

  let targetPrefix = "";

  for (
    let index = prefixStart;
    index < value.length && targetPrefix.length < "data:image/".length;
    index += 1
  ) {
    if (value[index] === "\n" || value[index] === "\r") {
      break;
    }

    targetPrefix += value[index].toLowerCase();
  }

  return targetPrefix.startsWith("data:image/")
    || (targetPrefix.startsWith("data:") && "data:image/".startsWith(targetPrefix));
};

const unescapeMarkdownText = (value: string) => {
  let result = "";

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "\\" && index + 1 < value.length) {
      index += 1;
    }

    result += value[index];
  }

  return result;
};

const replaceMarkdownMedia = (value: string, isImage: boolean) => {
  const marker = isImage ? "![" : "[";
  let cursor = 0;
  let result = "";

  while (cursor < value.length) {
    const markerStart = value.indexOf(marker, cursor);

    if (markerStart < 0) {
      result += value.slice(cursor);
      break;
    }

    if (!isImage && markerStart > 0 && value[markerStart - 1] === "!") {
      result += value.slice(cursor, markerStart + 1);
      cursor = markerStart + 1;
      continue;
    }

    const labelStart = markerStart + marker.length;
    const labelEnd = findMarkdownLabelEnd(value, labelStart);

    if (labelEnd < 0) {
      result += value.slice(cursor);
      break;
    }

    if (value[labelEnd + 1] !== "(") {
      result += value.slice(cursor, labelEnd + 1);
      cursor = labelEnd + 1;
      continue;
    }

    const targetStart = labelEnd + 2;
    const label = unescapeMarkdownText(value.slice(labelStart, labelEnd));
    const isDataImageTarget = isImage && isDataImageMarkdownTarget(value, targetStart);
    const targetEnd = findMarkdownTargetEnd(
      value,
      targetStart,
      isDataImageTarget,
    );

    if (targetEnd < 0) {
      if (isDataImageTarget) {
        let lineEnd = targetStart;

        while (lineEnd < value.length && value[lineEnd] !== "\n" && value[lineEnd] !== "\r") {
          lineEnd += 1;
        }

        result += value.slice(cursor, markerStart);
        result += ` ${imagePreviewText(label)} `;
        cursor = lineEnd;
        continue;
      }

      result += value.slice(cursor);
      break;
    }

    result += value.slice(cursor, markerStart);
    result += ` ${isImage ? imagePreviewText(label) : label} `;
    cursor = targetEnd + 1;
  }

  return result;
};

export const toPlainTextPreview = (content?: string | null, maxLength = 120) => {
  if (!content) {
    return "";
  }

  const contentWithoutHtmlImages = content
    .replace(/<img\b[^>]*>/gi, (imageTag) => {
      const altText = imageTag.match(/\balt\s*=\s*"([^"]*)"/i)?.[1]
        ?? imageTag.match(/\balt\s*=\s*'([^']*)'/i)?.[1];

      return ` ${imagePreviewText(altText)} `;
    });
  const contentWithoutImages = replaceMarkdownMedia(contentWithoutHtmlImages, true);
  const contentWithoutLinks = replaceMarkdownMedia(contentWithoutImages, false);

  return contentWithoutLinks
    .replace(/data:image\/[^\s)>"']+/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[*_~`>#|!]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
};

export const toPostPreview = (post: ApiPost): PostPreview => ({
  id: post.id,
  category: post.category,
  title: post.title,
  excerpt: toPlainTextPreview(post.content),
  author: authorName(post.author),
  createdAt: formatRelativeDateLabel(post.createdAt),
  viewCount: post.viewCount,
  commentCount: post._count?.comments ?? 0,
  likeCount: post._count?.reactions ?? 0,
});

export const toRoutinePreview = (routine: ApiRoutine): RoutinePreview => {
  const summary = toPlainTextPreview(routine.summary) || toPlainTextPreview(routine.content);
  const days = routine.days ?? [];
  const dayLabels = days.map((day) => routineDayLabel[day.dayOfWeek]);
  const exerciseCount = days.reduce(
    (count, day) => count + (day._count?.exercises ?? day.exercises?.length ?? 0),
    0,
  );

  return {
    id: routine.id,
    publicCode: routine.publicCode,
    title: routine.title,
    summary,
    author: authorName(routine.author),
    viewCount: routine.viewCount ?? 0,
    likeCount: routine.likeCount ?? routine._count?.likes ?? 0,
    commentCount: routine._count?.comments ?? routine.comments?.length ?? 0,
    dayLabels,
    exerciseCount,
    createdAt: formatRelativeDateLabel(routine.createdAt),
  };
};

export const toWikiPreview = (wiki: ApiWiki): WikiPreview => ({
  slug: wiki.slug,
  name: wiki.name,
  targetMuscles: wiki.targetMuscles ?? [],
  equipment: wiki.equipment || "미정",
  difficulty: wiki.difficulty || "미정",
  description: wiki.description,
});
