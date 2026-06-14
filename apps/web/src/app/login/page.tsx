"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import api from "@/lib/api";
import FindIdModal from "./FindIdComponent";
import FindPasswordModal from "./FindPasswordComponent";
import SignUpModal from "./SignUpComponent";

type ModalType = "signup" | "findId" | "findPassword" | null;

const providers = [
  { id: "kakao", label: "카카오 로그인", className: "bg-[#FEE500] text-slate-950 hover:bg-yellow-300" },
  { id: "naver", label: "네이버 로그인", className: "bg-[#03C75A] text-white hover:bg-emerald-600" },
  { id: "google", label: "Google 로그인", className: "border border-slate-300 bg-white text-slate-700 hover:border-slate-500" },
];

const getApiMessage = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response
  ) {
    const responseData = error.response.data;
    if (
      typeof responseData === "object" &&
      responseData !== null &&
      "message" in responseData &&
      typeof responseData.message === "string"
    ) {
      return responseData.message;
    }
  }

  return "로그인 중 오류가 발생했습니다.";
};

export default function LoginPage() {
  const [modalOpen, setModalOpen] = useState<ModalType>(null);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await api.post("/auth/login", { loginId, password });
      window.location.href = "/";
    } catch (loginError) {
      setError(getApiMessage(loginError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const startOAuth = async (provider: string) => {
    setError(null);

    try {
      const response = await api.get<{
        authUrl?: string;
        setupRequired?: boolean;
        message?: string;
        requiredEnv?: string[];
      }>(`/auth/oauth/${provider}`);

      if (response.data.authUrl) {
        window.location.href = response.data.authUrl;
        return;
      }

      setError(
        response.data.message ??
          `${provider} 로그인을 사용하려면 OAuth 환경변수를 먼저 설정해야 합니다.`,
      );
    } catch (oauthError) {
      setError(getApiMessage(oauthError));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm border border-slate-200 bg-white p-7 shadow-sm">
        <Link href="/" className="block text-center text-3xl font-black text-slate-950">
          짐슐랭
        </Link>
        <p className="mt-2 text-center text-sm text-slate-500">웨이트 커뮤니티에 로그인하세요</p>

        <form onSubmit={login} className="mt-7 space-y-4">
          <div>
            <label htmlFor="login-id" className="mb-1.5 block text-sm font-medium text-slate-700">
              이메일 또는 아이디
            </label>
            <input
              id="login-id"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              required
              className="input-style"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="input-style"
            />
          </div>
          <button type="submit" disabled={isSubmitting} className="button-primary">
            {isSubmitting ? "로그인 중" : "로그인"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium text-slate-400">SNS 로그인</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid gap-2">
          {providers.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => startOAuth(provider.id)}
              className={`rounded px-4 py-2.5 text-sm font-semibold transition ${provider.className}`}
            >
              {provider.label}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex justify-center gap-4 text-sm">
          <button type="button" onClick={() => setModalOpen("signup")} className="text-emerald-700 hover:underline">
            회원가입
          </button>
          <button type="button" onClick={() => setModalOpen("findId")} className="text-slate-600 hover:underline">
            아이디 찾기
          </button>
          <button type="button" onClick={() => setModalOpen("findPassword")} className="text-slate-600 hover:underline">
            비밀번호 찾기
          </button>
        </div>
      </div>

      {modalOpen === "signup" && <SignUpModal onClose={() => setModalOpen(null)} />}
      {modalOpen === "findId" && <FindIdModal onClose={() => setModalOpen(null)} />}
      {modalOpen === "findPassword" && <FindPasswordModal onClose={() => setModalOpen(null)} />}
    </div>
  );
}
