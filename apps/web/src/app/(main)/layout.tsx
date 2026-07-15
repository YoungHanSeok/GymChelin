// 메인 영역에 공통 헤더와 광고 슬롯을 배치한다.
import AdSlot from "@/components/ads/AdSlot";
import Header from "@/components/layout/Header";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header />
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <AdSlot slot="MAIN_TOP" label="상단 광고" />
        </div>
      </div>
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-6 lg:grid-cols-[160px_minmax(0,1fr)_220px]">
        <aside className="order-2 lg:order-1">
          <div className="lg:sticky lg:top-24">
            <AdSlot slot="MAIN_LEFT" label="왼쪽 광고" />
          </div>
        </aside>
        <section className="order-1 min-w-0 lg:order-2">{children}</section>
        <aside className="order-3 space-y-5">
          <div className="space-y-5 lg:sticky lg:top-24">
            <AdSlot slot="MAIN_RIGHT" label="오른쪽 광고" />
          </div>
        </aside>
      </main>
    </div>
  );
}
