export type PostPreview = {
  id: number;
  category: "FREE" | "WORKOUT_LOG";
  title: string;
  excerpt: string;
  author: string;
  createdAt: string;
  viewCount: number;
  commentCount: number;
  likeCount: number;
};

export type RoutinePreview = {
  id: number;
  title: string;
  summary: string;
  author: string;
  likeCount: number;
  createdAt: string;
};

export type GymPreview = {
  providerPlaceId: string;
  name: string;
  addressName: string;
  avgRating: number;
  reviewCount: number;
  externalRating?: number | null;
  placeUrl?: string;
};

export type WikiPreview = {
  slug: string;
  name: string;
  targetMuscles: string[];
  equipment: string;
  difficulty: string;
  description: string;
};

export const samplePosts: PostPreview[] = [
  {
    id: 1,
    category: "FREE",
    title: "3대 500까지 정체기 뚫은 루틴 공유합니다",
    excerpt: "주 4회 기준으로 볼륨을 낮추고 강도 관리를 바꿨더니 회복이 훨씬 좋아졌습니다.",
    author: "ironlog",
    createdAt: "오늘",
    viewCount: 382,
    commentCount: 18,
    likeCount: 42,
  },
  {
    id: 2,
    category: "WORKOUT_LOG",
    title: "하체 day: 스쿼트 5x5, RPE 8",
    excerpt: "허리 피로가 있어서 백오프 세트는 레그프레스로 대체했습니다.",
    author: "dailyPR",
    createdAt: "오늘",
    viewCount: 156,
    commentCount: 7,
    likeCount: 16,
  },
  {
    id: 3,
    category: "FREE",
    title: "초보자에게 머신 위주 루틴도 충분히 좋을까요?",
    excerpt: "프리웨이트가 아직 무서워서 머신으로 시작하려고 합니다.",
    author: "firstset",
    createdAt: "어제",
    viewCount: 211,
    commentCount: 24,
    likeCount: 9,
  },
];

export const sampleRoutines: RoutinePreview[] = [
  {
    id: 1,
    title: "직장인 45분 상체 루틴",
    summary: "벤치프레스, 랫풀다운, 숄더프레스, 케이블 로우를 짧고 굵게 구성했습니다.",
    author: "liftafterwork",
    likeCount: 128,
    createdAt: "오늘",
  },
  {
    id: 2,
    title: "초보 3분할 루틴",
    summary: "가슴/등/하체 중심으로 운동 습관을 만드는 8주 루틴입니다.",
    author: "coachK",
    likeCount: 93,
    createdAt: "이번주",
  },
];

export const sampleGyms: GymPreview[] = [
  {
    providerPlaceId: "demo-gangnam",
    name: "짐슐랭 강남 스트렝스",
    addressName: "서울 강남구 테헤란로 123",
    avgRating: 4.7,
    reviewCount: 32,
    externalRating: null,
    placeUrl: "https://map.kakao.com",
  },
  {
    providerPlaceId: "demo-hongdae",
    name: "짐슐랭 홍대 피트니스",
    addressName: "서울 마포구 양화로 45",
    avgRating: 4.4,
    reviewCount: 18,
    externalRating: null,
    placeUrl: "https://map.kakao.com",
  },
];

export const sampleWiki: WikiPreview[] = [
  {
    slug: "squat",
    name: "스쿼트",
    targetMuscles: ["대퇴사두근", "둔근", "햄스트링"],
    equipment: "바벨 또는 맨몸",
    difficulty: "중급",
    description: "하체와 코어 안정성을 함께 키우는 대표 복합 운동입니다.",
  },
  {
    slug: "bench-press",
    name: "벤치프레스",
    targetMuscles: ["대흉근", "삼두근", "전면 삼각근"],
    equipment: "바벨, 벤치",
    difficulty: "중급",
    description: "가슴과 상체 프레스 힘을 기르는 기본 운동입니다.",
  },
  {
    slug: "deadlift",
    name: "데드리프트",
    targetMuscles: ["햄스트링", "둔근", "척추기립근"],
    equipment: "바벨",
    difficulty: "상급",
    description: "후면 사슬과 전신 힘을 키우는 힙힌지 운동입니다.",
  },
];
