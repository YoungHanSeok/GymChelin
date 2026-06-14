const slots = [
  "MAIN_TOP",
  "MAIN_LEFT",
  "MAIN_RIGHT",
  "POST_LIST_INLINE",
  "GYM_DETAIL_SIDE",
];

export default function AdminAdsPage() {
  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-4">
        <p className="text-sm font-semibold text-emerald-700">관리자</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">광고 관리</h1>
        <p className="mt-2 text-sm text-slate-600">
          직접 판매 배너가 활성화되면 같은 슬롯에서 AdSense보다 우선 노출됩니다.
        </p>
      </header>

      <section className="border-b border-slate-200 pb-5">
        <h2 className="text-base font-semibold text-slate-950">광고 슬롯</h2>
        <div className="mt-4 divide-y divide-slate-100 border-y border-slate-200">
          {slots.map((slot) => (
            <div key={slot} className="grid gap-2 py-4 md:grid-cols-[180px_minmax(0,1fr)]">
              <strong className="text-sm text-slate-950">{slot}</strong>
              <span className="text-sm text-slate-600">
                직접 배너 기간/우선순위가 맞으면 배너 노출, 없으면 AdSense, 설정이 없으면 placeholder 노출
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-slate-200 pb-5">
        <h2 className="text-base font-semibold text-slate-950">운영 API</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-600">
          <code>GET /api/admin/ads/placements</code>
          <code>PATCH /api/admin/ads/placements/:slot</code>
          <code>GET /api/admin/ads/banners</code>
          <code>POST /api/admin/ads/banners</code>
        </div>
      </section>
    </div>
  );
}
