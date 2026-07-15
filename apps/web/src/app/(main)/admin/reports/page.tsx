// 관리자 신고 처리 화면의 기본 구조를 제공한다.
export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-4">
        <p className="text-sm font-semibold text-emerald-700">관리자</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">신고 관리</h1>
        <p className="mt-2 text-sm text-slate-600">
          신고된 게시글, 댓글, 루틴, 헬스장 리뷰를 확인하고 블라인드 처리합니다.
        </p>
      </header>

      <section className="border-b border-slate-200 pb-5">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["대기", "0"],
            ["처리 완료", "0"],
            ["반려", "0"],
          ].map(([label, value]) => (
            <div key={label} className="border-t border-slate-300 pt-3">
              <strong className="block text-2xl font-black text-slate-950">{value}</strong>
              <span className="text-sm text-slate-600">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-slate-200 pb-5">
        <h2 className="text-base font-semibold text-slate-950">처리 흐름</h2>
        <ol className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
          <li>1. 사용자가 로그인 후 콘텐츠를 신고합니다.</li>
          <li>2. 관리자는 `/api/admin/reports`에서 신고 목록을 확인합니다.</li>
          <li>3. 블라인드가 필요하면 `/api/admin/moderation/:targetType/:targetId/blind`를 호출합니다.</li>
          <li>4. 대상 콘텐츠는 사용자 화면에서 숨겨지고 처리 이력이 남습니다.</li>
        </ol>
      </section>
    </div>
  );
}
