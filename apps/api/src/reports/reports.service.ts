// 중복 신고 방지, 신고 대상 검증, 블라인드 처리를 담당한다.
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContentStatus,
  Prisma,
  ReportStatus,
  ReportTargetType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    targetType: unknown;
    targetId: unknown;
    reason: unknown;
    reporterId: number;
  }) {
    const targetType = this.parseTargetType(input.targetType);
    const reason = this.parseRequiredReason(input.reason);
    const targetId = this.parsePositiveId(input.targetId, '신고 대상');

    await this.ensureReportableTarget({
      targetType,
      targetId,
      reporterId: input.reporterId,
    });

    return this.prisma.$transaction(async (tx) => {
      await this.acquireReportLock(tx, {
        targetType,
        targetId,
        reporterId: input.reporterId,
      });
      const duplicateReport = await tx.report.findFirst({
        where: {
          targetType,
          targetId,
          reporterId: input.reporterId,
        },
        select: { id: true },
      });

      if (duplicateReport) {
        throw new BadRequestException('이미 신고한 대상입니다.');
      }

      return tx.report.create({
        data: {
          targetType,
          targetId,
          reason,
          reporterId: input.reporterId,
        },
      });
    });
  }

  findAdminReports(query: { status?: unknown }) {
    const status = this.parseOptionalReportStatus(query.status);

    return this.prisma.report.findMany({
      where: status ? { status } : undefined,
      include: {
        reporter: { select: { id: true, nickname: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async blind(input: {
    targetType: unknown;
    targetId: unknown;
    reason?: unknown;
    adminId: number;
  }) {
    const targetType = this.parseTargetType(input.targetType);
    const targetId = this.parsePositiveId(input.targetId, '신고 대상');
    const reason = this.parseOptionalReason(input.reason);

    return this.prisma.$transaction(async (tx) => {
      await this.updateTargetStatus(
        tx,
        targetType,
        targetId,
        ContentStatus.BLINDED,
      );
      const moderationAction = await tx.moderationAction.create({
        data: {
          targetType,
          targetId,
          action: 'BLIND',
          reason,
          adminId: input.adminId,
        },
      });
      await tx.report.updateMany({
        where: { targetType, targetId, status: ReportStatus.PENDING },
        data: { status: ReportStatus.RESOLVED, resolvedAt: new Date() },
      });

      if (targetType === ReportTargetType.GYM_REVIEW) {
        await this.recalculateGymRating(tx, targetId);
      }

      return moderationAction;
    });
  }

  private async updateTargetStatus(
    tx: Prisma.TransactionClient,
    targetType: ReportTargetType,
    targetId: number,
    status: ContentStatus,
  ) {
    if (targetType === ReportTargetType.POST) {
      await this.ensureExists(
        tx.post.findUnique({
          where: { id: targetId },
          select: { id: true },
        }),
      );
      return tx.post.update({
        where: { id: targetId },
        data: { status },
      });
    }

    if (targetType === ReportTargetType.COMMENT) {
      await this.ensureExists(
        tx.comment.findUnique({
          where: { id: targetId },
          select: { id: true },
        }),
      );
      return tx.comment.update({
        where: { id: targetId },
        data: { status },
      });
    }

    if (targetType === ReportTargetType.ROUTINE) {
      await this.ensureExists(
        tx.routine.findUnique({
          where: { id: targetId },
          select: { id: true },
        }),
      );
      return tx.routine.update({
        where: { id: targetId },
        data: { status },
      });
    }

    if (targetType === ReportTargetType.ROUTINE_COMMENT) {
      await this.ensureExists(
        tx.routineComment.findUnique({
          where: { id: targetId },
          select: { id: true },
        }),
      );
      return tx.routineComment.update({
        where: { id: targetId },
        data: { status },
      });
    }

    await this.ensureExists(
      tx.gymReview.findUnique({
        where: { id: targetId },
        select: { id: true },
      }),
    );
    return tx.gymReview.update({
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

    if (input.targetType === ReportTargetType.GYM_REVIEW) {
      const review = await this.prisma.gymReview.findUnique({
        where: { id: input.targetId },
        select: { userId: true, status: true },
      });

      if (!review || review.status !== ContentStatus.ACTIVE) {
        throw new NotFoundException('대상을 찾을 수 없습니다.');
      }

      if (review.userId === input.reporterId) {
        throw new BadRequestException('본인의 리뷰는 신고할 수 없습니다.');
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

  private async recalculateGymRating(
    tx: Prisma.TransactionClient,
    reviewId: number,
  ) {
    const review = await tx.gymReview.findUnique({
      where: { id: reviewId },
      select: { gymId: true },
    });

    if (!review) {
      throw new NotFoundException('대상을 찾을 수 없습니다.');
    }

    const aggregate = await tx.gymReview.aggregate({
      where: { gymId: review.gymId, status: ContentStatus.ACTIVE },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.gymPlace.update({
      where: { id: review.gymId },
      data: {
        avgRating: Number((aggregate._avg.rating ?? 0).toFixed(2)),
        reviewCount: aggregate._count.rating,
      },
    });
  }

  private parseTargetType(value: unknown) {
    if (typeof value !== 'string') {
      throw new BadRequestException('지원하지 않는 신고 대상입니다.');
    }

    const targetType = value.trim().toUpperCase();
    if (
      !Object.values(ReportTargetType).includes(targetType as ReportTargetType)
    ) {
      throw new BadRequestException('지원하지 않는 신고 대상입니다.');
    }

    return targetType as ReportTargetType;
  }

  private parsePositiveId(value: unknown, label: string) {
    if (
      (typeof value !== 'string' && typeof value !== 'number') ||
      (typeof value === 'string' && !value.trim())
    ) {
      throw new BadRequestException(`올바른 ${label} ID를 입력해 주세요.`);
    }

    const id = Number(value);
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException(`올바른 ${label} ID를 입력해 주세요.`);
    }

    return id;
  }

  private parseRequiredReason(value: unknown) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException('신고 사유를 입력해 주세요.');
    }

    return this.validateReason(value.trim());
  }

  private parseOptionalReason(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('신고 처리 사유 형식이 올바르지 않습니다.');
    }

    const reason = value.trim();
    return reason ? this.validateReason(reason) : undefined;
  }

  private validateReason(reason: string) {
    if (reason.includes('\u0000')) {
      throw new BadRequestException(
        '신고 사유에 허용되지 않는 제어 문자를 입력할 수 없습니다.',
      );
    }

    if (reason.length > 1000) {
      throw new BadRequestException(
        '신고 사유는 1,000자 이내로 입력해 주세요.',
      );
    }

    return reason;
  }

  private parseOptionalReportStatus(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('올바른 신고 상태를 입력해 주세요.');
    }

    const status = value.trim().toUpperCase();
    if (!Object.values(ReportStatus).includes(status as ReportStatus)) {
      throw new BadRequestException('올바른 신고 상태를 입력해 주세요.');
    }

    return status as ReportStatus;
  }

  private async acquireReportLock(
    tx: Prisma.TransactionClient,
    input: {
      targetType: ReportTargetType;
      targetId: number;
      reporterId: number;
    },
  ) {
    // 동일 사용자의 동일 대상 신고만 직렬화해 기존 중복 데이터는 건드리지 않는다.
    const lockKey = `${input.targetType}:${input.targetId}:${input.reporterId}`;
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
    `;
  }
}
