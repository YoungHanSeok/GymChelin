import AdSlot from "@/components/ads/AdSlot";
import { sampleGyms } from "@/lib/mock-data";
import Link from "next/link";

export default async function GymDetailPage({
  params,
}: {
  params: Promise<{ providerPlaceId: string }>;
}) {
  const { providerPlaceId } = await params;
  const gym =
    sampleGyms.find((item) => item.providerPlaceId === decodeURIComponent(providerPlaceId)) ??
    sampleGyms[0];

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_240px]">
      <div className="space-y-6">
        <header className="border-b border-slate-200 pb-4">
          <Link href="/gyms" className="text-sm font-medium text-emerald-700 hover:text-emerald-900">
            헬스장 목록
          </Link>
          <h1 className="mt-3 text-2xl font-black text-slate-950">{gym.name}</h1>
          <p className="mt-2 text-sm text-slate-600">{gym.addressName}</p>
          {gym.placeUrl && (
            <a
              href={gym.placeUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-600 hover:text-emerald-700"
            >
              카카오맵에서 보기
            </a>
          )}
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="border-t border-slate-900 pt-3">
            <strong className="block text-3xl font-black text-slate-950">{gym.avgRating.toFixed(1)}</strong>
            <span className="text-sm text-slate-600">짐슐랭 자체 평점</span>
          </div>
          <div className="border-t border-slate-300 pt-3">
            <strong className="block text-3xl font-black text-slate-950">{gym.reviewCount}</strong>
            <span className="text-sm text-slate-600">회원 리뷰</span>
          </div>
          <div className="border-t border-slate-300 pt-3">
            <strong className="block text-base font-bold text-slate-950">공식 제공 시</strong>
            <span className="text-sm text-slate-600">외부 평점 병행 표기</span>
          </div>
        </section>

        <section className="border-b border-slate-200 pb-5">
          <h2 className="text-base font-semibold text-slate-950">리뷰 작성</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            평점과 리뷰 작성은 로그인 후 가능합니다. 리뷰는 짐슐랭 자체 데이터로 저장되며, 신고 시 관리자가 블라인드 처리할 수 있습니다.
          </p>
          <Link href="/login" className="mt-4 inline-flex rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            로그인 후 리뷰 쓰기
          </Link>
        </section>

        <section className="border-b border-slate-200 pb-5">
          <h2 className="text-base font-semibold text-slate-950">최근 리뷰</h2>
          <p className="mt-3 text-sm text-slate-500">아직 화면에 연결된 리뷰가 없습니다. API 연동 후 최신 리뷰가 표시됩니다.</p>
        </section>
      </div>

      <aside className="xl:pt-12">
        <AdSlot slot="GYM_DETAIL_SIDE" label="헬스장 상세 광고" />
      </aside>
    </div>
  );
}
