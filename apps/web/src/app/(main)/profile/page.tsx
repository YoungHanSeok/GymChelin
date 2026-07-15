"use client";

// 기존 프로필 주소를 계정 화면으로 연결한다.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/lib/auth-session";

const formatDate = (value: string | null) => {
  if (!value) {
    return "아직 인증하지 않았습니다";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading } = useAuthSession();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login?redirect=/profile");
    }
  }, [isLoading, router, user]);

  if (isLoading || !user) {
    return <div className="py-12 text-center text-sm text-slate-500">프로필을 불러오는 중입니다.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-950">프로필</h1>
        <p className="mt-2 text-sm text-slate-500">짐슐랭에서 표시되는 내 계정 정보입니다.</p>
      </div>

      <section className="border border-slate-200 bg-white p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">닉네임</dt>
            <dd className="mt-1 text-base font-semibold text-slate-950">{user.nickname}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">아이디</dt>
            <dd className="mt-1 text-base font-semibold text-slate-950">{user.username}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">이메일</dt>
            <dd className="mt-1 text-base font-semibold text-slate-950">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">이메일 인증</dt>
            <dd className="mt-1 text-base font-semibold text-slate-950">{formatDate(user.emailVerifiedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">권한</dt>
            <dd className="mt-1 text-base font-semibold text-slate-950">{user.role}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">가입일</dt>
            <dd className="mt-1 text-base font-semibold text-slate-950">{formatDate(user.createdAt)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
