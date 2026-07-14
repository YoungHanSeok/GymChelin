import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const ROUTINE_TARGET_BODY_PARTS = [
  '가슴',
  '등',
  '어깨',
  '이두',
  '삼두',
  '하체',
  '둔근',
  '코어',
  '전완',
  '전신',
  '유산소',
] as const;

export const ROUTINE_EQUIPMENTS = [
  '맨몸',
  '바벨',
  '덤벨',
  '케이블',
  '머신',
  '스미스머신',
  '밴드',
  '케틀벨',
  '풀업바',
  '기타',
] as const;

type CatalogQuery = {
  q?: string;
  bodyPart?: string;
  targetBodyPart?: string;
  equipment?: string;
  status?: string;
  page?: string;
  take?: string;
};

type CatalogInput = {
  name?: unknown;
  targetBodyPart?: unknown;
  equipment?: unknown;
  isActive?: unknown;
};

@Injectable()
export class RoutineExerciseCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(query: CatalogQuery) {
    const q = query.q?.trim();
    const targetBodyPart = query.bodyPart?.trim();
    const equipment = query.equipment?.trim();
    const take = this.parseTake(query.take, 50, 50);
    const where: Prisma.RoutineExerciseCatalogWhereInput = {
      isActive: true,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { targetBodyPart: { contains: q, mode: 'insensitive' } },
              { equipment: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(targetBodyPart ? { targetBodyPart } : {}),
      ...(equipment ? { equipment } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.routineExerciseCatalog.findMany({
        where,
        select: {
          id: true,
          name: true,
          targetBodyPart: true,
          equipment: true,
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take,
      }),
      this.prisma.routineExerciseCatalog.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        bodyParts: [item.targetBodyPart],
        equipment: item.equipment,
      })),
      total,
    };
  }

  async findPublicFilters() {
    const items = await this.prisma.routineExerciseCatalog.findMany({
      where: { isActive: true },
      select: { targetBodyPart: true, equipment: true },
    });

    return {
      bodyParts: [...new Set(items.map((item) => item.targetBodyPart))].sort(
        (first, second) => first.localeCompare(second, 'ko'),
      ),
      equipments: [...new Set(items.map((item) => item.equipment))].sort(
        (first, second) => first.localeCompare(second, 'ko'),
      ),
    };
  }

  getOptions() {
    return {
      targetBodyParts: [...ROUTINE_TARGET_BODY_PARTS],
      equipments: [...ROUTINE_EQUIPMENTS],
    };
  }

  async findAdmin(query: CatalogQuery) {
    const q = query.q?.trim();
    const targetBodyPart = query.targetBodyPart?.trim();
    const equipment = query.equipment?.trim();
    const isActive = this.parseStatus(query.status);
    const page = this.parsePage(query.page);
    const take = this.parseTake(query.take, 30);
    const where: Prisma.RoutineExerciseCatalogWhereInput = {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { targetBodyPart: { contains: q, mode: 'insensitive' } },
              { equipment: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(targetBodyPart ? { targetBodyPart } : {}),
      ...(equipment ? { equipment } : {}),
      ...(isActive === null ? {} : { isActive }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.routineExerciseCatalog.findMany({
        where,
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * take,
        take,
      }),
      this.prisma.routineExerciseCatalog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      take,
      totalPages: Math.max(1, Math.ceil(total / take)),
    };
  }

  async create(input: CatalogInput) {
    const data = this.normalizeCreateInput(input);

    try {
      return await this.prisma.routineExerciseCatalog.create({ data });
    } catch (error) {
      this.throwCatalogWriteError(error);
    }
  }

  async update(id: number, input: CatalogInput) {
    const data = this.normalizeUpdateInput(input);

    try {
      return await this.prisma.routineExerciseCatalog.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.throwCatalogWriteError(error);
    }
  }

  async deactivate(id: number) {
    try {
      return await this.prisma.routineExerciseCatalog.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (error) {
      this.throwCatalogWriteError(error);
    }
  }

  private normalizeCreateInput(input: CatalogInput) {
    return {
      name: this.parseRequiredString(input.name, 80, '운동명'),
      targetBodyPart: this.parseTargetBodyPart(input.targetBodyPart),
      equipment: this.parseEquipment(input.equipment),
      isActive: this.parseOptionalBoolean(input.isActive) ?? true,
    };
  }

  private normalizeUpdateInput(input: CatalogInput) {
    const data: Prisma.RoutineExerciseCatalogUpdateInput = {};

    if (input.name !== undefined) {
      data.name = this.parseRequiredString(input.name, 80, '운동명');
    }
    if (input.targetBodyPart !== undefined) {
      data.targetBodyPart = this.parseTargetBodyPart(input.targetBodyPart);
    }
    if (input.equipment !== undefined) {
      data.equipment = this.parseEquipment(input.equipment);
    }
    if (input.isActive !== undefined) {
      data.isActive = this.parseOptionalBoolean(input.isActive);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('수정할 운동 정보를 입력해 주세요.');
    }

    return data;
  }

  private parseTargetBodyPart(value: unknown) {
    const targetBodyPart = this.parseRequiredString(value, 50, '타겟 부위');

    if (
      !(ROUTINE_TARGET_BODY_PARTS as readonly string[]).includes(targetBodyPart)
    ) {
      throw new BadRequestException('지원하지 않는 타겟 부위입니다.');
    }

    return targetBodyPart;
  }

  private parseEquipment(value: unknown) {
    const equipment = this.parseRequiredString(value, 80, '기구');

    if (!(ROUTINE_EQUIPMENTS as readonly string[]).includes(equipment)) {
      throw new BadRequestException('지원하지 않는 기구입니다.');
    }

    return equipment;
  }

  private parseRequiredString(
    value: unknown,
    maxLength: number,
    label: string,
  ) {
    const normalized = typeof value === 'string' ? value.trim() : '';

    if (!normalized) {
      throw new BadRequestException(`${label}을(를) 입력해 주세요.`);
    }
    if (normalized.length > maxLength) {
      throw new BadRequestException(
        `${label}은(는) ${maxLength}자 이내로 입력해 주세요.`,
      );
    }

    return normalized;
  }

  private parseOptionalBoolean(value: unknown) {
    if (value === undefined) {
      return undefined;
    }
    if (typeof value !== 'boolean') {
      throw new BadRequestException('사용 여부는 참 또는 거짓이어야 합니다.');
    }

    return value;
  }

  private parseStatus(value?: string) {
    const status = value?.trim().toUpperCase() || 'ALL';

    if (status === 'ALL') {
      return null;
    }
    if (status === 'ACTIVE') {
      return true;
    }
    if (status === 'INACTIVE') {
      return false;
    }

    throw new BadRequestException('올바른 사용 상태를 입력해 주세요.');
  }

  private parseTake(
    value: string | undefined,
    defaultValue: number,
    maxValue = 200,
  ) {
    if (value === undefined || value === '') {
      return defaultValue;
    }

    const take = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(take) || take < 1) {
      throw new BadRequestException('조회 개수는 1 이상의 정수여야 합니다.');
    }

    return Math.min(take, maxValue);
  }

  private parsePage(value?: string) {
    if (value === undefined || value === '') {
      return 1;
    }

    const page = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(page) || page < 1) {
      throw new BadRequestException('페이지는 1 이상의 정수여야 합니다.');
    }

    return page;
  }

  private throwCatalogWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new BadRequestException('이미 등록된 운동입니다.');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('루틴 운동을 찾을 수 없습니다.');
      }
    }

    throw error;
  }
}
