import RoutineWriteForm from "./RoutineWriteForm";

export default function RoutineWritePage() {
  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-4">
        <p className="text-sm font-semibold text-emerald-700">나의 루틴</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">루틴 작성</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          요일별 운동과 세트를 구성해 나만의 루틴을 공개해 보세요.
        </p>
      </header>

      <RoutineWriteForm />
    </div>
  );
}
