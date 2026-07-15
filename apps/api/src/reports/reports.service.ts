// 중복 신고 방지와 신고 대상 검증을 처리한다.
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, ReportStatus, ReportTargetType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    targetType: string;
    targetId: number;
    reason: string;
    reporterId: number;
  }) {
    const targetType = this.parseTargetType(input.targetType);
    const reason = input.reason?.trim();
    const targetId = Number(input.targetId);

    if (!reason) {
      throw new BadRequestException('신고 사유를 입력해 주세요.');
    }

    if (!Number.isSafeInteger(targetId) || targetId < 1) {
      throw new BadRequestException('올바른 신고 대상 ID를 입력해 주세요.');
    }

    await this.ensureReportableTarget({
      targetType,
      targetId,
      reporterId: input.reporterId,
    });

    return this.prisma.report.create({
      data: {
        targetType,
        targetId,
        reason,
        reporterId: input.reporterId,
      },
    });
  }

  findAdminReports(query: { status?: string }) {
    const status = query.status?.toUpperCase();

    return this.prisma.report.findMany({
      where:
        status && Object.values(ReportStatus).includes(status as ReportStatus)
          ? { status: status as ReportStatus }
          : undefined,
      include: {
        reporter: { select: { id: true, nickname: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async blind(input: {
    targetType: string;
    targetId: number;
    reason?: string;
    adminId: number;
  }) {
    const targetType = this.parseTargetType(input.targetType);
    const targetId = Number(input.targetId);

    await this.updateTargetStatus(targetType, targetId, ContentStatus.BLINDED);

    const [moderationAction] = await this.prisma.$transaction([
      this.prisma.moderationAction.create({
        data: {
          targetType,
          targetId,
          action: 'BLIND',
          reason: input.reason,
          adminId: input.adminId,
        },
      }),
      this.prisma.report.updateMany({
        where: { targetType, targetId, status: ReportStatus.PENDING },
        data: { status: ReportStatus.RESOLVED, resolvedAt: new Date() },
      }),
    ]);

    return moderationAction;
  }

  private async updateTargetStatus(
    targetType: ReportTargetType,
    targetId: number,
    status: ContentStatus,
  ) {
    if (targetType === ReportTargetType.POST) {
      await this.ensureExists(
        this.prisma.post.findUnique({
          where: { id: targetId },
          select: { id: true },
        }),
      );
      return this.prisma.post.update({
        where: { id: targetId },
        data: { status },
      });
    }

    if (targetType === ReportTargetType.COMMENT) {
      await this.ensureExists(
        this.prisma.comment.findUnique({
          where: { id: targetId },
          select: { id: true },
        }),
      );
      return this.prisma.comment.update({
        where: { id: targetId },
        data: { status },
      });
    }

    if (targetType === ReportTargetType.ROUTINE) {
      await this.ensureExists(
        this.prisma.routine.findUnique({
          where: { id: targetId },
          select: { id: true },
        }),
      );
      return this.prisma.routine.update({
        where: { id: targetId },
        data: { status },
      });
    }

    if (targetType === ReportTargetType.ROUTINE_COMMENT) {
      await this.ensureExists(
        this.prisma.routineComment.findUnique({
          where: { id: targetId },
          select: { id: true },
        }),
      );
      return this.prisma.routineComment.update({
        where: { id: targetId },
        data: { status },
      });
    }

    await this.ensureExists(
      this.prisma.gymReview.findUnique({
        where: { id: targetId },
        select: { id: true },
      }),
    );
    return this.prisma.gymReview.update({
      where: { id: targetId },
      data: { status },
    });
  }

  private async ensureExists<T>(promise: Promise<T | null>) {
    const value = await promise;
    if (!value) {
      throw new NotFoundException('대상을 찾을 수 없습니다.');
    }
  }

  private async ensureReportableTarget(input: {
    targetType: ReportTargetType;
    targetId: number;
    reporterId: number;
  }) {
    if (input.targetType === ReportTargetType.ROUTINE) {
      const routine = await this.prisma.routine.findUnique({
        where: { id: input.targetId },
        select: { authorId: true },
      });

      if (!routine) {
        throw new NotFoundException('대상을 찾을 수 없습니다.');
      }

      if (routine.authorId === input.reporterId) {
        throw new BadRequestException('본인의 루틴은 신고할 수 없습니다.');
      }

      return;
    }

    if (input.targetType === ReportTargetType.ROUTINE_COMMENT) {
      const comment = await this.prisma.routineComment.findUnique({
        where: { id: input.targetId },
        select: { authorId: true },
      });

      if (!comment) {
        throw new NotFoundException('대상을 찾을 수 없습니다.');
      }

      if (comment.authorId === input.reporterId) {
        throw new BadRequestException('본인의 댓글은 신고할 수 없습니다.');
      }

      return;
    }

    if (input.targetType !== ReportTargetType.COMMENT) {
      return;
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id: input.targetId },
      select: { authorId: true },
    });

    if (!comment) {
      throw new NotFoundException('대상을 찾을 수 없습니다.');
    }

    if (comment.authorId === input.reporterId) {
      throw new BadRequestException('본인의 댓글은 신고할 수 없습니다.');
    }
  }

  private parseTargetType(value: string) {
    const targetType = value?.toUpperCase();
    if (
      !Object.values(ReportTargetType).includes(targetType as ReportTargetType)
    ) {
      throw new BadRequestException('지원하지 않는 신고 대상입니다.');
    }

    return targetType as ReportTargetType;
  }
}
