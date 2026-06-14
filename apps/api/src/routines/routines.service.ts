import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ROUTINE_INCLUDE = {
  author: { select: { id: true, nickname: true, username: true } },
  _count: { select: { likes: true } },
} as const;

@Injectable()
export class RoutinesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: { q?: string; take?: string }) {
    const take = Math.min(Number(query.take ?? 20) || 20, 50);
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
              ],
            }
          : {}),
      },
      include: ROUTINE_INCLUDE,
      orderBy: [{ likeCount: 'desc' }, { createdAt: 'desc' }],
      take,
    });
  }

  async findOne(id: number) {
    const routine = await this.prisma.routine.findFirst({
      where: { id, status: ContentStatus.ACTIVE },
      include: ROUTINE_INCLUDE,
    });

    if (!routine) {
      throw new NotFoundException('루틴을 찾을 수 없습니다.');
    }

    await this.prisma.routine.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return routine;
  }

  create(input: { title: string; summary?: string; content: string; authorId: number }) {
    const title = input.title?.trim();
    const content = input.content?.trim();
    const summary = input.summary?.trim() || content.slice(0, 120);

    if (!title || !content) {
      throw new BadRequestException('루틴 제목과 내용을 입력해 주세요.');
    }

    return this.prisma.routine.create({
      data: {
        title,
        summary,
        content,
        authorId: input.authorId,
      },
      include: ROUTINE_INCLUDE,
    });
  }

  async toggleLike(routineId: number, userId: number) {
    await this.ensureRoutine(routineId);

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.routineLike.findUnique({
        where: { routineId_userId: { routineId, userId } },
      });

      if (existing) {
        await tx.routineLike.delete({ where: { id: existing.id } });
        const routine = await tx.routine.update({
          where: { id: routineId },
          data: { likeCount: { decrement: 1 } },
          select: { likeCount: true },
        });

        return { liked: false, likeCount: Math.max(routine.likeCount, 0) };
      }

      await tx.routineLike.create({ data: { routineId, userId } });
      const routine = await tx.routine.update({
        where: { id: routineId },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      });

      return { liked: true, likeCount: routine.likeCount };
    });

    return result;
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
}
