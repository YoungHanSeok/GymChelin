// 위키 문서의 검색, 조회, 수정 규칙을 처리한다.
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WikiService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { q?: string }) {
    const q = query.q?.trim();
    const dbItems = await this.prisma.exerciseWiki.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { targetMuscles: { has: q } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
      take: 50,
    });

    return dbItems;
  }

  async findOne(slug: string) {
    const item = await this.prisma.exerciseWiki.findUnique({ where: { slug } });

    if (!item) {
      throw new NotFoundException('운동 정보를 찾을 수 없습니다.');
    }

    return item;
  }

  create(input: any) {
    if (!input.slug || !input.name || !input.description) {
      throw new BadRequestException('운동명, 슬러그, 설명은 필수입니다.');
    }

    return this.prisma.exerciseWiki.create({
      data: {
        slug: input.slug,
        name: input.name,
        targetMuscles: input.targetMuscles ?? [],
        equipment: input.equipment,
        difficulty: input.difficulty ?? '초급',
        description: input.description,
        howTo: input.howTo ?? [],
        effects: input.effects ?? [],
        cautions: input.cautions ?? [],
      },
    });
  }
}
