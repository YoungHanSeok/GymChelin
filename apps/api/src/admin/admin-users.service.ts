// 최고 관리자가 관리자 권한을 관리하는 비즈니스 규칙을 처리한다.
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

type AdminUserQuery = {
  page?: unknown;
  take?: unknown;
  searchType?: unknown;
  keyword?: unknown;
  roleFilter?: unknown;
};

type AdminRoleUpdate = {
  userId?: unknown;
  role?: unknown;
  adminExpiresAt?: unknown;
};

type AdminRoleUpdateBody = {
  updates?: unknown;
};

type SearchType = 'EMAIL' | 'USERNAME';
type RoleFilter = 'ALL' | 'ADMIN' | 'USER';

const ADMIN_USER_SELECT = {
  id: true,
  email: true,
  username: true,
  role: true,
  adminExpiresAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async findAll(query: AdminUserQuery) {
    await this.usersService.demoteAllExpiredAdmins();

    const page = this.parsePage(query.page);
    const take = this.parseTake(query.take);
    const searchType = this.parseSearchType(query.searchType);
    const keyword = this.parseKeyword(query.keyword, searchType);
    const roleFilter = this.parseRoleFilter(query.roleFilter);
    const where: Prisma.UserWhereInput = {
      deleteYN: 'N',
      ...(roleFilter === 'ALL' ? {} : { role: roleFilter }),
      ...(keyword
        ? {
            [searchType === 'EMAIL' ? 'email' : 'username']: {
              contains: keyword,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const total = await this.prisma.user.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / take));
    const resolvedPage = Math.min(page, totalPages);
    const items = await this.prisma.user.findMany({
      where,
      select: ADMIN_USER_SELECT,
      orderBy: [{ role: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      skip: (resolvedPage - 1) * take,
      take,
    });

    return {
      items,
      total,
      page: resolvedPage,
      take,
      totalPages,
    };
  }

  async updateRoles(body: AdminRoleUpdateBody) {
    const updates = this.parseUpdates(body);

    await this.usersService.demoteAllExpiredAdmins();

    const items = await this.prisma.$transaction(async (transaction) => {
      const userIds = updates.map((update) => update.userId);
      const users = await transaction.user.findMany({
        where: {
          id: { in: userIds },
          deleteYN: 'N',
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (users.length !== userIds.length) {
        throw new NotFoundException('변경할 회원을 찾을 수 없습니다.');
      }

      if (users.some((user) => user.role === UserRole.SUPER_ADMIN)) {
        throw new ForbiddenException('최고 관리자 권한은 변경할 수 없습니다.');
      }

      for (const update of updates) {
        const result = await transaction.user.updateMany({
          where: {
            id: update.userId,
            deleteYN: 'N',
            role: { not: UserRole.SUPER_ADMIN },
          },
          data: {
            role: update.role,
            adminExpiresAt: update.adminExpiresAt,
          },
        });

        if (result.count !== 1) {
          throw new ForbiddenException(
            '최고 관리자 또는 탈퇴한 회원의 권한은 변경할 수 없습니다.',
          );
        }
      }

      const updatedUsers = await transaction.user.findMany({
        where: { id: { in: userIds } },
        select: ADMIN_USER_SELECT,
      });
      const usersById = new Map(updatedUsers.map((user) => [user.id, user]));

      return userIds.map((userId) => {
        const user = usersById.get(userId);
        if (!user) {
          throw new NotFoundException('변경한 회원 정보를 찾을 수 없습니다.');
        }

        return user;
      });
    });

    return {
      items,
      updatedCount: items.length,
    };
  }

  private parseUpdates(body: AdminRoleUpdateBody) {
    if (!Array.isArray(body?.updates) || body.updates.length === 0) {
      throw new BadRequestException('변경할 회원 권한을 입력해 주세요.');
    }
    if (body.updates.length > 50) {
      throw new BadRequestException(
        '회원 권한은 한 번에 최대 50건까지 변경할 수 있습니다.',
      );
    }

    const now = new Date();
    const updates = body.updates.map((value) =>
      this.parseUpdate(value as AdminRoleUpdate, now),
    );
    const userIds = updates.map((update) => update.userId);

    if (new Set(userIds).size !== userIds.length) {
      throw new BadRequestException(
        '동일한 회원을 중복해서 변경할 수 없습니다.',
      );
    }

    return updates;
  }

  private parseUpdate(value: AdminRoleUpdate, now: Date) {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException('회원 권한 변경 값을 확인해 주세요.');
    }

    const userId = Number(value.userId);
    if (
      typeof value.userId !== 'number' ||
      !Number.isSafeInteger(userId) ||
      userId < 1
    ) {
      throw new BadRequestException('올바른 회원 ID를 입력해 주세요.');
    }

    if (value.role !== UserRole.ADMIN && value.role !== UserRole.USER) {
      throw new BadRequestException(
        '회원 권한은 ADMIN 또는 USER만 지정할 수 있습니다.',
      );
    }

    if (value.role === UserRole.USER) {
      if (value.adminExpiresAt !== null) {
        throw new BadRequestException(
          '일반 회원의 관리자 만료일은 null이어야 합니다.',
        );
      }

      return {
        userId,
        role: UserRole.USER,
        adminExpiresAt: null,
      };
    }

    if (value.adminExpiresAt === null) {
      return {
        userId,
        role: UserRole.ADMIN,
        adminExpiresAt: null,
      };
    }

    const adminExpiresAt = this.parseFutureDate(value.adminExpiresAt, now);

    return {
      userId,
      role: UserRole.ADMIN,
      adminExpiresAt,
    };
  }

  private parseFutureDate(value: unknown, now: Date) {
    if (
      typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        value,
      )
    ) {
      throw new BadRequestException(
        '관리자 만료일은 시간대가 포함된 날짜와 시간이어야 합니다.',
      );
    }

    const adminExpiresAt = new Date(value);
    if (
      Number.isNaN(adminExpiresAt.getTime()) ||
      adminExpiresAt.getTime() <= now.getTime()
    ) {
      throw new BadRequestException(
        '관리자 만료일은 현재보다 미래여야 합니다.',
      );
    }

    return adminExpiresAt;
  }

  private parsePage(value: unknown) {
    if (value === undefined || value === '') {
      return 1;
    }
    if (typeof value !== 'string') {
      throw new BadRequestException('페이지 값을 확인해 주세요.');
    }

    const page = Number(value);
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(page)) {
      throw new BadRequestException('페이지는 1 이상의 정수여야 합니다.');
    }

    return page;
  }

  private parseTake(value: unknown) {
    if (value === undefined || value === '') {
      return 10;
    }
    if (typeof value !== 'string') {
      throw new BadRequestException('조회 개수를 확인해 주세요.');
    }

    const take = Number(value);
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(take) || take > 50) {
      throw new BadRequestException(
        '조회 개수는 1 이상 50 이하의 정수여야 합니다.',
      );
    }

    return take;
  }

  private parseSearchType(value: unknown): SearchType {
    if (value === undefined || value === '') {
      return 'EMAIL';
    }
    if (typeof value !== 'string') {
      throw new BadRequestException('검색 조건을 확인해 주세요.');
    }

    const searchType = value.trim().toUpperCase();
    if (searchType !== 'EMAIL' && searchType !== 'USERNAME') {
      throw new BadRequestException(
        '검색 조건은 이메일 또는 아이디여야 합니다.',
      );
    }

    return searchType;
  }

  private parseKeyword(value: unknown, searchType: SearchType) {
    if (value === undefined || value === '') {
      return '';
    }
    if (typeof value !== 'string') {
      throw new BadRequestException('검색어 값을 확인해 주세요.');
    }

    const keyword = value.trim();
    const maxLength = searchType === 'EMAIL' ? 120 : 30;
    if (keyword.length > maxLength) {
      throw new BadRequestException(
        `검색어는 ${maxLength}자 이내로 입력해 주세요.`,
      );
    }

    return keyword;
  }

  private parseRoleFilter(value: unknown): RoleFilter {
    if (value === undefined || value === '') {
      return 'ALL';
    }
    if (typeof value !== 'string') {
      throw new BadRequestException('권한 검색 조건을 확인해 주세요.');
    }

    const roleFilter = value.trim().toUpperCase();
    if (
      roleFilter !== 'ALL' &&
      roleFilter !== 'ADMIN' &&
      roleFilter !== 'USER'
    ) {
      throw new BadRequestException(
        '권한 검색 조건은 전체, ADMIN, USER 중 하나여야 합니다.',
      );
    }

    return roleFilter;
  }
}
