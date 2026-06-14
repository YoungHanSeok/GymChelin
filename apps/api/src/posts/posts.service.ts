import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, PostCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const POST_INCLUDE = {
  author: { select: { id: true, nickname: true, username: true } },
  _count: { select: { comments: true, reactions: true } },
} as const;

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { category?: string; q?: string; take?: string }) {
    const category = query.category ? this.parseCategory(query.category) : undefined;
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
    const post = await this.prisma.post.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      include: {
        ...POST_INCLUDE,
        comments: {
          where: { status: ContentStatus.ACTIVE },
          include: { author: { select: { id: true, nickname: true, username: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (post.status !== ContentStatus.ACTIVE) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    return post;
  }

  create(input: { category: string; title: string; content: string; authorId: number }) {
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

  async addComment(postId: number, input: { content: string; authorId: number }) {
    const content = input.content?.trim();
    if (!content) {
      throw new BadRequestException('댓글 내용을 입력해 주세요.');
    }

    await this.ensurePost(postId);

    return this.prisma.comment.create({
      data: {
        postId,
        authorId: input.authorId,
        content,
      },
      include: { author: { select: { id: true, nickname: true, username: true } } },
    });
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

  private parseCategory(value: string) {
    const category = value.toUpperCase();
    if (!Object.values(PostCategory).includes(category as PostCategory)) {
      throw new BadRequestException('지원하지 않는 게시판입니다.');
    }

    return category as PostCategory;
  }
}
