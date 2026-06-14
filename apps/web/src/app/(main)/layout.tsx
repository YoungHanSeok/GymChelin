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
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <AdSlot slot="MAIN_LEFT" label="왼쪽 광고" />
          </div>
        </aside>
        <section className="min-w-0">{children}</section>
        <aside className="space-y-5">
          <div className="sticky top-24 space-y-5">
            <AdSlot slot="MAIN_RIGHT" label="오른쪽 광고" />
            <section className="border-t border-slate-200 pt-4">
              <h2 className="mb-3 text-sm font-bold text-slate-950">운영 바로가기</h2>
              <div className="grid gap-2 text-sm">
                <a className="text-slate-600 hover:text-emerald-700" href="/admin/reports">
                  신고 관리
                </a>
                <a className="text-slate-600 hover:text-emerald-700" href="/admin/ads">
                  광고 관리
                </a>
              </div>
            </section>
          </div>
        </aside>
      </main>
    </div>
  );
}
