import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommentReactionType,
  ContentStatus,
  PostCategory,
  Prisma,
} from '@prisma/client';
import { isAdminRole } from '../auth/admin-role';
import { PrismaService } from '../prisma/prisma.service';

const POST_INCLUDE = {
  author: { select: { id: true, nickname: true, username: true } },
  _count: { select: { comments: true, reactions: true, editHistories: true } },
} as const;

const COMMENT_INCLUDE = {
  author: { select: { id: true, nickname: true, username: true } },
  reactions: { select: { type: true } },
} as const;

type CommentEntity = Prisma.CommentGetPayload<{
  include: typeof COMMENT_INCLUDE;
}>;

export type CommentView = {
  id: number;
  content: string;
  status: ContentStatus;
  isDeleted: boolean;
  postId: number;
  parentId: number | null;
  author: CommentEntity['author'] | null;
  createdAt: Date;
  updatedAt: Date;
  likeCount: number;
  dislikeCount: number;
  replies: CommentView[];
};

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { category?: string; q?: string; take?: string }) {
    const category = query.category
      ? this.parseCategory(query.category)
      : undefined;
    const take = Math.min(Number(query.take ?? 20) || 20, 50);
    const q = query.q?.trim();

    return this.prisma.post.findMany({
      where: {
        status: ContentStatus.ACTIVE,
        category,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { content: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: POST_INCLUDE,
      orderBy: [{ createdAt: 'desc' }],
      take,
    });
  }

  async findOne(id: number) {
    const post = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.post.updateMany({
        where: { id, status: ContentStatus.ACTIVE },
        data: { viewCount: { increment: 1 } },
      });

      if (updateResult.count === 0) {
        return null;
      }

      return tx.post.findFirst({
        where: { id, status: ContentStatus.ACTIVE },
        include: {
          ...POST_INCLUDE,
          comments: {
            where: {
              status: { in: [ContentStatus.ACTIVE, ContentStatus.DELETED] },
            },
            include: COMMENT_INCLUDE,
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    return {
      ...post,
      comments: this.buildCommentTree(post.comments),
    };
  }

  create(input: {
    category: string;
    title: string;
    content: string;
    authorId: number;
  }) {
    const title = input.title?.trim();
    const content = input.content?.trim();

    if (!title || !content) {
      throw new BadRequestException('제목과 내용을 입력해 주세요.');
    }

    return this.prisma.post.create({
      data: {
        category: this.parseCategory(input.category),
        title,
        content,
        authorId: input.authorId,
      },
      include: POST_INCLUDE,
    });
  }

  async update(
    postId: number,
    input: {
      title: string;
      content: string;
      editorId: number;
      editorRole?: string;
    },
  ) {
    const title = input.title?.trim();
    const content = input.content?.trim();

    if (!title || !content) {
      throw new BadRequestException('제목과 내용을 입력해 주세요.');
    }

    return this.prisma.$transaction(async (tx) => {
      const post = await tx.post.findFirst({
        where: { id: postId, status: ContentStatus.ACTIVE },
        include: POST_INCLUDE,
      });

      if (!post) {
        throw new NotFoundException('게시글을 찾을 수 없습니다.');
      }

      if (post.authorId !== input.editorId && !isAdminRole(input.editorRole)) {
        throw new ForbiddenException('게시글을 수정할 권한이 없습니다.');
      }

      if (post.title === title && post.content === content) {
        return post;
      }

      await tx.postEditHistory.create({
        data: {
          postId,
          editorId: input.editorId,
          title: post.title,
          content: post.content,
        },
      });

      return tx.post.update({
        where: { id: postId },
        data: {
          title,
          content,
        },
        include: POST_INCLUDE,
      });
    });
  }

  async findHistory(postId: number) {
    await this.ensurePost(postId);

    return this.prisma.postEditHistory.findMany({
      where: { postId },
      include: {
        editor: { select: { id: true, nickname: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addComment(
    postId: number,
    input: { content: string; parentId?: unknown; authorId: number },
  ) {
    const content = input.content?.trim();
    if (!content) {
      throw new BadRequestException('댓글 내용을 입력해 주세요.');
    }

    await this.ensurePost(postId);
    const parentId = this.parseOptionalCommentId(input.parentId);

    if (parentId) {
      await this.ensureComment(postId, parentId, true);
    }

    const comment = await this.prisma.comment.create({
      data: {
        postId,
        authorId: input.authorId,
        parentId,
        content,
      },
      include: COMMENT_INCLUDE,
    });

    return this.toCommentView(comment);
  }

  async toggleCommentReaction(input: {
    postId: number;
    commentId: number;
    type: string;
    userId: number;
  }) {
    const type = this.parseCommentReactionType(input.type);
    await this.ensureComment(input.postId, input.commentId, true);

    const existing = await this.prisma.commentReaction.findUnique({
      where: {
        commentId_userId: {
          commentId: input.commentId,
          userId: input.userId,
        },
      },
    });

    if (existing?.type === type) {
      await this.prisma.commentReaction.delete({
        where: { id: existing.id },
      });
    } else if (existing) {
      await this.prisma.commentReaction.update({
        where: { id: existing.id },
        data: { type },
      });
    } else {
      await this.prisma.commentReaction.create({
        data: {
          commentId: input.commentId,
          userId: input.userId,
          type,
        },
      });
    }

    const counts = await this.getCommentReactionCounts(input.commentId);

    return {
      reaction: existing?.type === type ? null : type,
      ...counts,
    };
  }

  async deleteComment(input: {
    postId: number;
    commentId: number;
    userId: number;
    userRole?: string;
  }) {
    const comment = await this.ensureComment(
      input.postId,
      input.commentId,
      false,
    );

    if (comment.status === ContentStatus.DELETED) {
      return { ok: true };
    }

    if (comment.authorId !== input.userId && !isAdminRole(input.userRole)) {
      throw new ForbiddenException('댓글을 삭제할 권한이 없습니다.');
    }

    await this.prisma.comment.update({
      where: { id: input.commentId },
      data: { status: ContentStatus.DELETED },
    });

    return { ok: true };
  }

  async toggleLike(postId: number, userId: number) {
    await this.ensurePost(postId);

    const existing = await this.prisma.reaction.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await this.prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.reaction.create({ data: { postId, userId } });
    }

    const likeCount = await this.prisma.reaction.count({ where: { postId } });

    return {
      liked: !existing,
      likeCount,
    };
  }

  async dailyPopular() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [free, workoutLog] = await Promise.all([
      this.findPopularByCategory(PostCategory.FREE, since),
      this.findPopularByCategory(PostCategory.WORKOUT_LOG, since),
    ]);

    return {
      FREE: free,
      WORKOUT_LOG: workoutLog,
    };
  }

  private findPopularByCategory(category: PostCategory, since: Date) {
    return this.prisma.post.findMany({
      where: {
        category,
        status: ContentStatus.ACTIVE,
        createdAt: { gte: since },
      },
      include: POST_INCLUDE,
      orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
      take: 8,
    });
  }

  private async ensurePost(postId: number) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, status: ContentStatus.ACTIVE },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
  }

  private async ensureComment(
    postId: number,
    commentId: number,
    activeOnly: boolean,
  ) {
    const comment = await this.prisma.comment.findFirst({
      where: {
        id: commentId,
        postId,
        ...(activeOnly ? { status: ContentStatus.ACTIVE } : {}),
      },
      select: { id: true, authorId: true, status: true },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    return comment;
  }

  private buildCommentTree(comments: CommentEntity[]) {
    const commentMap = new Map<number, CommentView>();
    const roots: CommentView[] = [];

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

  private toCommentView(comment: CommentEntity): CommentView {
    const isDeleted = comment.status === ContentStatus.DELETED;
    const likeCount = comment.reactions.filter(
      (reaction) => reaction.type === CommentReactionType.LIKE,
    ).length;
    const dislikeCount = comment.reactions.filter(
      (reaction) => reaction.type === CommentReactionType.DISLIKE,
    ).length;

    return {
      id: comment.id,
      content: isDeleted ? '삭제된 댓글입니다.' : comment.content,
      status: comment.status,
      isDeleted,
      postId: comment.postId,
      parentId: comment.parentId,
      author: comment.author,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      likeCount,
      dislikeCount,
      replies: [],
    };
  }

  private async getCommentReactionCounts(commentId: number) {
    const reactions = await this.prisma.commentReaction.groupBy({
      by: ['type'],
      where: { commentId },
      _count: { type: true },
    });

    return {
      likeCount:
        reactions.find((reaction) => reaction.type === CommentReactionType.LIKE)
          ?._count.type ?? 0,
      dislikeCount:
        reactions.find(
          (reaction) => reaction.type === CommentReactionType.DISLIKE,
        )?._count.type ?? 0,
    };
  }

  private parseOptionalCommentId(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const commentId = Number(value);

    if (!Number.isSafeInteger(commentId) || commentId < 1) {
      throw new BadRequestException('올바른 댓글 ID를 입력해 주세요.');
    }

    return commentId;
  }

  private parseCommentReactionType(value: string) {
    const type = value?.toUpperCase();

    if (
      !Object.values(CommentReactionType).includes(type as CommentReactionType)
    ) {
      throw new BadRequestException('지원하지 않는 댓글 반응입니다.');
    }

    return type as CommentReactionType;
  }

  private parseCategory(value: string) {
    const category = value.toUpperCase();
    if (!Object.values(PostCategory).includes(category as PostCategory)) {
      throw new BadRequestException('지원하지 않는 게시판입니다.');
    }

    return category as PostCategory;
  }
}
