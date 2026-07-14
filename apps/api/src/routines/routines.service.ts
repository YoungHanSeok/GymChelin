import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, Prisma, RoutineDayOfWeek } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { isAdminRole } from '../auth/admin-role';
import { PrismaService } from '../prisma/prisma.service';

const ROUTINE_LIST_INCLUDE = {
  author: { select: { id: true, nickname: true, username: true } },
  _count: { select: { likes: true, comments: true } },
  days: {
    select: {
      dayOfWeek: true,
      sortOrder: true,
      _count: { select: { exercises: true } },
    },
    orderBy: { sortOrder: 'asc' as const },
  },
} as const;

const ROUTINE_COMMENT_INCLUDE = {
  author: { select: { id: true, nickname: true, username: true } },
} as const;

const VISIBLE_COMMENT_STATUSES: ContentStatus[] = [
  ContentStatus.ACTIVE,
  ContentStatus.DELETED,
];

const ROUTINE_DETAIL_INCLUDE = {
  author: { select: { id: true, nickname: true, username: true } },
  _count: { select: { likes: true, comments: true } },
  days: {
    include: {
      exercises: {
        include: {
          sets: { orderBy: { sortOrder: 'asc' as const } },
        },
        orderBy: { sortOrder: 'asc' as const },
      },
    },
    orderBy: { sortOrder: 'asc' as const },
  },
  comments: {
    where: {
      status: { in: VISIBLE_COMMENT_STATUSES },
    },
    include: ROUTINE_COMMENT_INCLUDE,
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

type RoutineCommentEntity = Prisma.RoutineCommentGetPayload<{
  include: typeof ROUTINE_COMMENT_INCLUDE;
}>;

export type RoutineCommentView = {
  id: number;
  content: string;
  status: ContentStatus;
  isDeleted: boolean;
  routineId: number;
  parentId: number | null;
  author: RoutineCommentEntity['author'] | null;
  createdAt: Date;
  updatedAt: Date;
  replies: RoutineCommentView[];
};

type NormalizedRoutineSet = {
  weightKg: number;
  repetitions: number | null;
  durationMinutes: number | null;
};

type NormalizedRoutineExercise = {
  exerciseWikiId: number | null;
  exerciseName: string;
  bodyParts: string[];
  equipment: string | null;
  sets: NormalizedRoutineSet[];
};

type NormalizedRoutineDay = {
  dayOfWeek: RoutineDayOfWeek;
  exercises: NormalizedRoutineExercise[];
};

const DAY_OF_WEEK_VALUES = Object.values(RoutineDayOfWeek);
const PUBLIC_CODE_PATTERN = /^RT-[A-Z0-9]{8}$/;
const PUBLIC_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PUBLIC_CODE_CREATE_ATTEMPTS = 5;

const imageSummaryText = (altText?: string) => altText?.trim() || '이미지';

const findMarkdownLabelEnd = (value: string, start: number) => {
  let nestedBrackets = 0;

  for (let index = start; index < value.length; index += 1) {
    if (value[index] === '\\') {
      index += 1;
    } else if (value[index] === '[') {
      nestedBrackets += 1;
    } else if (value[index] === ']') {
      if (nestedBrackets === 0) {
        return index;
      }

      nestedBrackets -= 1;
    }
  }

  return -1;
};

const findMarkdownTargetEnd = (
  value: string,
  start: number,
  stopAtLineBreak = false,
) => {
  let nestedParentheses = 0;
  let isAngleDestination = value[start] === '<';
  let titleQuote: '"' | "'" | null = null;

  for (let index = start; index < value.length; index += 1) {
    if (stopAtLineBreak && (value[index] === '\n' || value[index] === '\r')) {
      return -1;
    }

    if (value[index] === '\\') {
      if (
        stopAtLineBreak &&
        (value[index + 1] === '\n' || value[index + 1] === '\r')
      ) {
        return -1;
      }

      index += 1;
    } else if (isAngleDestination) {
      if (value[index] === '>') {
        isAngleDestination = false;
      }
    } else if (titleQuote) {
      if (value[index] === titleQuote) {
        titleQuote = null;
      }
    } else if (
      (value[index] === '"' || value[index] === "'") &&
      index > start &&
      ' \t\r\n'.includes(value[index - 1])
    ) {
      titleQuote = value[index] as '"' | "'";
    } else if (value[index] === '(') {
      nestedParentheses += 1;
    } else if (value[index] === ')') {
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

  while (
    prefixStart < value.length &&
    (value[prefixStart] === ' ' || value[prefixStart] === '\t')
  ) {
    prefixStart += 1;
  }

  let targetPrefix = '';

  for (
    let index = prefixStart;
    index < value.length && targetPrefix.length < 'data:image/'.length;
    index += 1
  ) {
    if (value[index] === '\n' || value[index] === '\r') {
      break;
    }

    targetPrefix += value[index].toLowerCase();
  }

  return (
    targetPrefix.startsWith('data:image/') ||
    (targetPrefix.startsWith('data:') && 'data:image/'.startsWith(targetPrefix))
  );
};

const unescapeMarkdownText = (value: string) => {
  let result = '';

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '\\' && index + 1 < value.length) {
      index += 1;
    }

    result += value[index];
  }

  return result;
};

const replaceMarkdownMedia = (value: string, isImage: boolean) => {
  const marker = isImage ? '![' : '[';
  let cursor = 0;
  let result = '';

  while (cursor < value.length) {
    const markerStart = value.indexOf(marker, cursor);

    if (markerStart < 0) {
      result += value.slice(cursor);
      break;
    }

    if (!isImage && markerStart > 0 && value[markerStart - 1] === '!') {
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

    if (value[labelEnd + 1] !== '(') {
      result += value.slice(cursor, labelEnd + 1);
      cursor = labelEnd + 1;
      continue;
    }

    const targetStart = labelEnd + 2;
    const label = unescapeMarkdownText(value.slice(labelStart, labelEnd));
    const isDataImageTarget =
      isImage && isDataImageMarkdownTarget(value, targetStart);
    const targetEnd = findMarkdownTargetEnd(
      value,
      targetStart,
      isDataImageTarget,
    );

    if (targetEnd < 0) {
      if (isDataImageTarget) {
        let lineEnd = targetStart;

        while (
          lineEnd < value.length &&
          value[lineEnd] !== '\n' &&
          value[lineEnd] !== '\r'
        ) {
          lineEnd += 1;
        }

        result += value.slice(cursor, markerStart);
        result += ` ${imageSummaryText(label)} `;
        cursor = lineEnd;
        continue;
      }

      result += value.slice(cursor);
      break;
    }

    result += value.slice(cursor, markerStart);
    result += ` ${isImage ? imageSummaryText(label) : label} `;
    cursor = targetEnd + 1;
  }

  return result;
};

const toRoutineSummary = (content: string) => {
  const contentWithoutHtmlImages = content.replace(
    /<img\b[^>]*>/gi,
    (imageTag) => {
      const altText =
        imageTag.match(/\balt\s*=\s*"([^"]*)"/i)?.[1] ??
        imageTag.match(/\balt\s*=\s*'([^']*)'/i)?.[1];

      return ` ${imageSummaryText(altText)} `;
    },
  );
  const contentWithoutImages = replaceMarkdownMedia(
    contentWithoutHtmlImages,
    true,
  );
  const contentWithoutLinks = replaceMarkdownMedia(contentWithoutImages, false);

  return contentWithoutLinks
    .replace(/data:image\/[^\s)>"']+/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_~`>#|!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
};

@Injectable()
export class RoutinesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: { q?: string; take?: string; sort?: string }) {
    const take = this.parseTake(query.take);
    const q = query.q?.trim();

    return this.prisma.routine.findMany({
      where: {
        status: ContentStatus.ACTIVE,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { summary: { contains: q, mode: 'insensitive' } },
                { content: { contains: q, mode: 'insensitive' } },
                { publicCode: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: ROUTINE_LIST_INCLUDE,
      orderBy: this.parseSort(query.sort),
      take,
    });
  }

  async findOne(id: number) {
    const routine = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.routine.updateMany({
        where: { id, status: ContentStatus.ACTIVE },
        data: { viewCount: { increment: 1 } },
      });

      if (updateResult.count === 0) {
        return null;
      }

      return tx.routine.findFirst({
        where: { id, status: ContentStatus.ACTIVE },
        include: ROUTINE_DETAIL_INCLUDE,
      });
    });

    if (!routine) {
      throw new NotFoundException('루틴을 찾을 수 없습니다.');
    }

    return {
      ...routine,
      comments: this.buildCommentTree(routine.comments),
    };
  }

  async findImportPreview(publicCode: string) {
    const normalizedPublicCode = this.parsePublicCode(publicCode);
    const routine = await this.prisma.routine.findFirst({
      where: {
        publicCode: normalizedPublicCode,
        status: ContentStatus.ACTIVE,
      },
      select: {
        publicCode: true,
        title: true,
        days: {
          select: {
            dayOfWeek: true,
            sortOrder: true,
            exercises: {
              select: {
                exerciseWikiId: true,
                exerciseName: true,
                bodyParts: true,
                equipment: true,
                sortOrder: true,
                sets: {
                  select: {
                    sortOrder: true,
                    weightKg: true,
                    repetitions: true,
                    durationMinutes: true,
                  },
                  orderBy: { sortOrder: 'asc' },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!routine) {
      throw new NotFoundException('해당 고유코드의 루틴을 찾을 수 없습니다.');
    }

    return routine;
  }

  async findExerciseCatalog(query: {
    q?: string;
    bodyPart?: string;
    equipment?: string;
    take?: string;
  }) {
    const q = query.q?.trim();
    const bodyPart = query.bodyPart?.trim();
    const equipment = query.equipment?.trim();
    const take = this.parseTake(query.take);
    const where: Prisma.ExerciseWikiWhereInput = {
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      ...(bodyPart ? { targetMuscles: { has: bodyPart } } : {}),
      ...(equipment
        ? { equipment: { equals: equipment, mode: 'insensitive' } }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.exerciseWiki.findMany({
        where,
        select: {
          id: true,
          name: true,
          targetMuscles: true,
          equipment: true,
        },
        orderBy: { name: 'asc' },
        take,
      }),
      this.prisma.exerciseWiki.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        bodyParts: item.targetMuscles,
        equipment: item.equipment,
      })),
      total,
    };
  }

  async findExerciseCatalogFilters() {
    const items = await this.prisma.exerciseWiki.findMany({
      select: { targetMuscles: true, equipment: true },
    });
    const bodyParts = new Set<string>();
    const equipments = new Set<string>();

    items.forEach((item) => {
      item.targetMuscles.forEach((bodyPart) => {
        const value = bodyPart.trim();
        if (value) {
          bodyParts.add(value);
        }
      });

      const equipment = item.equipment?.trim();
      if (equipment) {
        equipments.add(equipment);
      }
    });

    return {
      bodyParts: [...bodyParts].sort((first, second) =>
        first.localeCompare(second, 'ko'),
      ),
      equipments: [...equipments].sort((first, second) =>
        first.localeCompare(second, 'ko'),
      ),
    };
  }

  async create(input: {
    title: string;
    summary?: string;
    content?: string;
    tags?: unknown;
    days?: unknown;
    authorId: number;
  }) {
    const title = input.title?.trim();
    const content = input.content?.trim() ?? '';

    if (!title) {
      throw new BadRequestException('루틴 제목을 입력해 주세요.');
    }

    if (title.length > 180) {
      throw new BadRequestException('루틴 제목은 180자 이내로 입력해 주세요.');
    }

    const requestedSummary = input.summary?.trim();
    const summary = toRoutineSummary(requestedSummary || content);
    const tags = this.normalizeTags(input.tags);
    const days = await this.normalizeDays(input.days);

    for (let attempt = 0; attempt < PUBLIC_CODE_CREATE_ATTEMPTS; attempt += 1) {
      const publicCode = this.createPublicCode();

      try {
        const routine = await this.prisma.$transaction((tx) =>
          tx.routine.create({
            data: {
              publicCode,
              title,
              summary,
              content,
              tags,
              author: { connect: { id: input.authorId } },
              days: {
                create: days.map((day, dayIndex) => ({
                  dayOfWeek: day.dayOfWeek,
                  sortOrder: dayIndex + 1,
                  exercises: {
                    create: day.exercises.map((exercise, exerciseIndex) => ({
                      exerciseName: exercise.exerciseName,
                      bodyParts: exercise.bodyParts,
                      equipment: exercise.equipment,
                      sortOrder: exerciseIndex + 1,
                      ...(exercise.exerciseWikiId
                        ? {
                            exerciseWiki: {
                              connect: { id: exercise.exerciseWikiId },
                            },
                          }
                        : {}),
                      sets: {
                        create: exercise.sets.map((routineSet, setIndex) => ({
                          sortOrder: setIndex + 1,
                          weightKg: routineSet.weightKg,
                          repetitions: routineSet.repetitions,
                          durationMinutes: routineSet.durationMinutes,
                        })),
                      },
                    })),
                  },
                })),
              },
            },
            include: ROUTINE_DETAIL_INCLUDE,
          }),
        );

        return {
          ...routine,
          comments: this.buildCommentTree(routine.comments),
        };
      } catch (error) {
        if (this.isPublicCodeConflict(error)) {
          continue;
        }

        throw error;
      }
    }

    throw new InternalServerErrorException(
      '루틴 고유코드를 생성하지 못했습니다. 다시 시도해 주세요.',
    );
  }

  async toggleLike(routineId: number, userId: number) {
    await this.ensureRoutine(routineId);

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.routineLike.findUnique({
        where: { routineId_userId: { routineId, userId } },
      });

      if (existing) {
        await tx.routineLike.delete({ where: { id: existing.id } });
      } else {
        await tx.routineLike.create({ data: { routineId, userId } });
      }

      const likeCount = await tx.routineLike.count({ where: { routineId } });
      await tx.routine.update({
        where: { id: routineId },
        data: { likeCount },
      });

      return { liked: !existing, likeCount };
    });

    return result;
  }

  async addComment(
    routineId: number,
    input: { content: string; parentId?: unknown; authorId: number },
  ) {
    const content = input.content?.trim();
    if (!content) {
      throw new BadRequestException('댓글 내용을 입력해 주세요.');
    }

    if (content.length > 2000) {
      throw new BadRequestException('댓글은 2,000자 이내로 입력해 주세요.');
    }

    await this.ensureRoutine(routineId);
    const parentId = this.parseOptionalId(input.parentId, '댓글');

    if (parentId) {
      await this.ensureComment(routineId, parentId, true);
    }

    const comment = await this.prisma.routineComment.create({
      data: {
        routineId,
        authorId: input.authorId,
        parentId,
        content,
      },
      include: ROUTINE_COMMENT_INCLUDE,
    });

    return this.toCommentView(comment);
  }

  async deleteComment(input: {
    routineId: number;
    commentId: number;
    userId: number;
    userRole?: string;
  }) {
    const comment = await this.ensureComment(
      input.routineId,
      input.commentId,
      false,
    );

    if (comment.status === ContentStatus.DELETED) {
      return { ok: true };
    }

    if (comment.authorId !== input.userId && !isAdminRole(input.userRole)) {
      throw new ForbiddenException('댓글을 삭제할 권한이 없습니다.');
    }

    await this.prisma.routineComment.update({
      where: { id: input.commentId },
      data: { status: ContentStatus.DELETED },
    });

    return { ok: true };
  }

  private async ensureRoutine(routineId: number) {
    const routine = await this.prisma.routine.findFirst({
      where: { id: routineId, status: ContentStatus.ACTIVE },
      select: { id: true },
    });

    if (!routine) {
      throw new NotFoundException('루틴을 찾을 수 없습니다.');
    }
  }

  private async ensureComment(
    routineId: number,
    commentId: number,
    activeOnly: boolean,
  ) {
    const comment = await this.prisma.routineComment.findFirst({
      where: {
        id: commentId,
        routineId,
        ...(activeOnly ? { status: ContentStatus.ACTIVE } : {}),
      },
      select: { id: true, authorId: true, status: true },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    return comment;
  }

  private buildCommentTree(comments: RoutineCommentEntity[]) {
    const commentMap = new Map<number, RoutineCommentView>();
    const roots: RoutineCommentView[] = [];

    comments.forEach((comment) => {
      commentMap.set(comment.id, this.toCommentView(comment));
    });

    commentMap.forEach((comment) => {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(comment);
          return;
        }
      }

      roots.push(comment);
    });

    return roots;
  }

  private toCommentView(comment: RoutineCommentEntity): RoutineCommentView {
    const isDeleted = comment.status === ContentStatus.DELETED;

    return {
      id: comment.id,
      content: isDeleted ? '삭제된 댓글입니다.' : comment.content,
      status: comment.status,
      isDeleted,
      routineId: comment.routineId,
      parentId: comment.parentId,
      author: isDeleted ? null : comment.author,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      replies: [],
    };
  }

  private async normalizeDays(value: unknown): Promise<NormalizedRoutineDay[]> {
    if (!Array.isArray(value) || value.length === 0) {
      throw new BadRequestException('운동 요일을 최소 1개 선택해 주세요.');
    }

    if (value.length > DAY_OF_WEEK_VALUES.length) {
      throw new BadRequestException('운동 요일은 7개까지 선택할 수 있습니다.');
    }

    const selectedDays = new Set<RoutineDayOfWeek>();
    const days = value.map((rawDay) => {
      const day = this.toRecord(rawDay, '요일 정보');
      const dayOfWeek = this.parseDayOfWeek(day.dayOfWeek);

      if (selectedDays.has(dayOfWeek)) {
        throw new BadRequestException('같은 요일을 두 번 등록할 수 없습니다.');
      }
      selectedDays.add(dayOfWeek);

      if (!Array.isArray(day.exercises) || day.exercises.length === 0) {
        throw new BadRequestException(
          '선택한 요일에는 운동을 최소 1개 등록해 주세요.',
        );
      }

      if (day.exercises.length > 30) {
        throw new BadRequestException(
          '하루 운동은 30개까지 등록할 수 있습니다.',
        );
      }

      const exercises = day.exercises.map((rawExercise) =>
        this.normalizeExercise(rawExercise),
      );

      return { dayOfWeek, exercises };
    });

    const exerciseWikiIds = [
      ...new Set(
        days.flatMap((day) =>
          day.exercises.flatMap((exercise) =>
            exercise.exerciseWikiId ? [exercise.exerciseWikiId] : [],
          ),
        ),
      ),
    ];
    const exerciseWikis = exerciseWikiIds.length
      ? await this.prisma.exerciseWiki.findMany({
          where: { id: { in: exerciseWikiIds } },
          select: {
            id: true,
            name: true,
            targetMuscles: true,
            equipment: true,
          },
        })
      : [];
    const exerciseWikiMap = new Map(
      exerciseWikis.map((exerciseWiki) => [exerciseWiki.id, exerciseWiki]),
    );

    if (exerciseWikiMap.size !== exerciseWikiIds.length) {
      throw new BadRequestException('선택한 운동 정보를 찾을 수 없습니다.');
    }

    return days.map((day) => ({
      ...day,
      exercises: day.exercises.map((exercise) => {
        if (!exercise.exerciseWikiId) {
          return exercise;
        }

        const exerciseWiki = exerciseWikiMap.get(exercise.exerciseWikiId);
        if (!exerciseWiki) {
          throw new BadRequestException('선택한 운동 정보를 찾을 수 없습니다.');
        }

        return {
          ...exercise,
          exerciseName: exerciseWiki.name,
          bodyParts: exerciseWiki.targetMuscles,
          equipment: exerciseWiki.equipment,
        };
      }),
    }));
  }

  private normalizeExercise(value: unknown): NormalizedRoutineExercise {
    const exercise = this.toRecord(value, '운동 정보');
    const exerciseWikiId = this.parseOptionalId(
      exercise.exerciseWikiId,
      '운동',
    );
    const exerciseName =
      typeof exercise.exerciseName === 'string'
        ? exercise.exerciseName.trim()
        : '';

    if (!exerciseWikiId && !exerciseName) {
      throw new BadRequestException('운동명을 입력해 주세요.');
    }

    if (exerciseName.length > 80) {
      throw new BadRequestException('운동명은 80자 이내로 입력해 주세요.');
    }

    if (!Array.isArray(exercise.sets) || exercise.sets.length === 0) {
      throw new BadRequestException('운동별 세트를 최소 1개 등록해 주세요.');
    }

    if (exercise.sets.length > 30) {
      throw new BadRequestException(
        '한 운동의 세트는 30개까지 등록할 수 있습니다.',
      );
    }

    return {
      exerciseWikiId,
      exerciseName,
      bodyParts: this.normalizeStringArray(exercise.bodyParts, 10, 50, '부위'),
      equipment: this.normalizeOptionalString(exercise.equipment, 80, '기구'),
      sets: exercise.sets.map((routineSet) => this.normalizeSet(routineSet)),
    };
  }

  private normalizeSet(value: unknown): NormalizedRoutineSet {
    const routineSet = this.toRecord(value, '세트 정보');
    const weightKg = this.parseInteger(routineSet.weightKg, '무게', 0);
    const repetitions = this.parseOptionalInteger(
      routineSet.repetitions,
      '반복횟수',
      1,
    );
    const durationMinutes = this.parseOptionalInteger(
      routineSet.durationMinutes,
      '운동 시간',
      1,
    );

    if (repetitions === null && durationMinutes === null) {
      throw new BadRequestException(
        '각 세트에 반복횟수 또는 운동 시간을 입력해 주세요.',
      );
    }

    return { weightKg, repetitions, durationMinutes };
  }

  private normalizeTags(value: unknown) {
    if (value === undefined || value === null) {
      return [];
    }

    return this.normalizeStringArray(value, 10, 30, '태그');
  }

  private normalizeStringArray(
    value: unknown,
    maxItems: number,
    maxLength: number,
    label: string,
  ) {
    if (value === undefined || value === null) {
      return [];
    }

    if (!Array.isArray(value)) {
      throw new BadRequestException(`${label} 형식이 올바르지 않습니다.`);
    }

    const items = value.map((item) => {
      if (typeof item !== 'string' || !item.trim()) {
        throw new BadRequestException(`${label} 값을 확인해 주세요.`);
      }

      const normalizedItem = item.trim();
      if (normalizedItem.length > maxLength) {
        throw new BadRequestException(
          `${label}는 항목당 ${maxLength}자 이내로 입력해 주세요.`,
        );
      }

      return normalizedItem;
    });
    const uniqueItems = [...new Set(items)];

    if (uniqueItems.length > maxItems) {
      throw new BadRequestException(
        `${label}는 ${maxItems}개까지 입력할 수 있습니다.`,
      );
    }

    return uniqueItems;
  }

  private normalizeOptionalString(
    value: unknown,
    maxLength: number,
    label: string,
  ) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${label} 형식이 올바르지 않습니다.`);
    }

    const normalizedValue = value.trim();
    if (!normalizedValue) {
      return null;
    }

    if (normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${label}는 ${maxLength}자 이내로 입력해 주세요.`,
      );
    }

    return normalizedValue;
  }

  private parseDayOfWeek(value: unknown) {
    const dayOfWeek = typeof value === 'string' ? value.toUpperCase() : '';

    if (!DAY_OF_WEEK_VALUES.includes(dayOfWeek as RoutineDayOfWeek)) {
      throw new BadRequestException('지원하지 않는 운동 요일입니다.');
    }

    return dayOfWeek as RoutineDayOfWeek;
  }

  private parseInteger(value: unknown, label: string, minimum: number) {
    if (
      (typeof value !== 'number' && typeof value !== 'string') ||
      value === ''
    ) {
      throw new BadRequestException(`${label} 값을 확인해 주세요.`);
    }

    const normalizedValue =
      typeof value === 'string' && /^-?\d+$/.test(value.trim())
        ? Number(value)
        : value;

    if (
      typeof normalizedValue !== 'number' ||
      !Number.isSafeInteger(normalizedValue) ||
      normalizedValue < minimum
    ) {
      throw new BadRequestException(
        `${label}는 ${minimum} 이상의 정수로 입력해 주세요.`,
      );
    }

    return normalizedValue;
  }

  private parseOptionalInteger(value: unknown, label: string, minimum: number) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return this.parseInteger(value, label, minimum);
  }

  private parseOptionalId(value: unknown, label: string) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return this.parseInteger(value, `${label} ID`, 1);
  }

  private toRecord(value: unknown, label: string) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException(`${label} 형식이 올바르지 않습니다.`);
    }

    return value as Record<string, unknown>;
  }

  private parsePublicCode(value: string) {
    const publicCode = value?.trim().toUpperCase();
    if (!PUBLIC_CODE_PATTERN.test(publicCode)) {
      throw new BadRequestException('올바른 루틴 고유코드를 입력해 주세요.');
    }

    return publicCode;
  }

  private createPublicCode() {
    const bytes = randomBytes(8);
    let value = 'RT-';

    for (const byte of bytes) {
      value += PUBLIC_CODE_ALPHABET[byte % PUBLIC_CODE_ALPHABET.length];
    }

    return value;
  }

  private isPublicCodeConflict(error: unknown) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }

    const target = JSON.stringify(error.meta?.target ?? '');
    return target.includes('public_code') || target.includes('publicCode');
  }

  private parseTake(value?: string) {
    if (value === undefined || value === '') {
      return 20;
    }

    const take = Number(value);
    if (!Number.isSafeInteger(take) || take < 1) {
      throw new BadRequestException('조회 개수를 확인해 주세요.');
    }

    return Math.min(take, 50);
  }

  private parseSort(value?: string): Prisma.RoutineOrderByWithRelationInput[] {
    const sort = value?.toLowerCase() ?? 'latest';

    if (sort === 'latest') {
      return [{ createdAt: 'desc' }];
    }

    if (sort === 'views') {
      return [{ viewCount: 'desc' }, { createdAt: 'desc' }];
    }

    if (sort === 'comments') {
      return [{ comments: { _count: 'desc' } }, { createdAt: 'desc' }];
    }

    if (sort === 'likes') {
      return [{ likeCount: 'desc' }, { createdAt: 'desc' }];
    }

    throw new BadRequestException('지원하지 않는 정렬 방식입니다.');
  }
}
