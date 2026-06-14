import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_EXERCISES = [
  {
    id: 0,
    slug: 'squat',
    name: '스쿼트',
    targetMuscles: ['대퇴사두근', '둔근', '햄스트링', '코어'],
    equipment: '바벨 또는 맨몸',
    difficulty: '중급',
    description: '하체 근력과 전신 안정성을 함께 키우는 대표 복합 운동입니다.',
    howTo: ['발을 어깨너비로 둡니다.', '무릎과 발끝 방향을 맞춥니다.', '엉덩이를 뒤로 빼며 내려갑니다.', '발바닥 전체로 밀어 올라옵니다.'],
    effects: ['하체 근력 향상', '코어 안정성 강화', '운동 수행 능력 개선'],
    cautions: ['허리가 말리지 않게 합니다.', '무릎이 안쪽으로 무너지지 않게 합니다.'],
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: 0,
    slug: 'bench-press',
    name: '벤치프레스',
    targetMuscles: ['대흉근', '삼두근', '전면 삼각근'],
    equipment: '바벨, 벤치',
    difficulty: '중급',
    description: '상체 밀기 힘과 가슴 근육 발달에 효과적인 대표 운동입니다.',
    howTo: ['견갑을 모아 벤치에 고정합니다.', '손목과 팔꿈치를 수직에 가깝게 둡니다.', '바를 가슴 하단으로 내립니다.', '발로 지면을 밀며 바를 올립니다.'],
    effects: ['가슴 근육 발달', '상체 프레스 힘 증가', '삼두 보조 근력 강화'],
    cautions: ['어깨가 과하게 들리지 않게 합니다.', '반동으로 튕기지 않습니다.'],
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: 0,
    slug: 'deadlift',
    name: '데드리프트',
    targetMuscles: ['햄스트링', '둔근', '척추기립근', '광배근'],
    equipment: '바벨',
    difficulty: '상급',
    description: '후면 사슬과 전신 힘을 키우는 강력한 힙힌지 운동입니다.',
    howTo: ['바를 발 중앙 위에 둡니다.', '등을 단단히 고정하고 힙힌지를 만듭니다.', '바를 몸에 가깝게 유지하며 들어 올립니다.', '엉덩이를 접으며 같은 경로로 내려놓습니다.'],
    effects: ['후면 사슬 강화', '악력과 등 안정성 향상', '전신 출력 증가'],
    cautions: ['허리를 둥글게 말지 않습니다.', '바가 몸에서 멀어지지 않게 합니다.'],
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
];

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

    if (dbItems.length > 0) {
      return dbItems;
    }

    if (!q) {
      return DEFAULT_EXERCISES;
    }

    return DEFAULT_EXERCISES.filter((exercise) =>
      [
        exercise.name,
        exercise.description,
        exercise.difficulty,
        exercise.equipment ?? '',
        ...exercise.targetMuscles,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q.toLowerCase()),
    );
  }

  async findOne(slug: string) {
    const dbItem = await this.prisma.exerciseWiki.findUnique({ where: { slug } });
    const item = dbItem ?? DEFAULT_EXERCISES.find((exercise) => exercise.slug === slug);

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
