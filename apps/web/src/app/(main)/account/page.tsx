"use client";

import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/app/_components/modalComponent";
import api from "@/lib/api";
import { type AuthUser, useAuthSession } from "@/lib/auth-session";

type ApiMessageResponse = {
  message?: string;
};

type EmailVerificationResponse = ApiMessageResponse & {
  alreadyVerified?: boolean;
  devCode?: string;
  expiresInSeconds?: number;
};

type UserResponse = ApiMessageResponse & {
  user?: AuthUser;
};

const getApiMessage = (error: unknown, fallback: string) => {
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

  return fallback;
};

const formatDate = (value: string | null) => {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

function StatusMessage({ type, children }: { type: "success" | "error" | "info"; children: ReactNode }) {
  const className =
    type === "success"
      ? "bg-emerald-50 text-emerald-700"
      : type === "error"
        ? "bg-red-50 text-red-700"
        : "bg-slate-100 text-slate-700";

  return <p className={`rounded px-3 py-2 text-sm ${className}`}>{children}</p>;
}

function EyeIcon({ isVisible }: { isVisible: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      {isVisible ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="m2 2 20 20" />
          <path d="M6.7 6.7C3.7 8.8 2 12 2 12s3.5 7 10 7c1.8 0 3.3-.5 4.7-1.2" />
          <path d="M10.6 5.1C11.1 5 11.5 5 12 5c6.5 0 10 7 10 7a18.8 18.8 0 0 1-2.3 3.2" />
          <path d="M14.1 14.1A3 3 0 0 1 9.9 9.9" />
        </>
      )}
    </svg>
  );
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  inputRef,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  disabled: boolean;
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="input-style pr-11"
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          disabled={disabled}
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={isVisible ? `${label} 숨기기` : `${label} 보기`}
        >
          <EyeIcon isVisible={isVisible} />
        </button>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoading, refreshUser, logout } = useAuthSession();
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmNewPasswordRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isPasswordSuccessOpen, setIsPasswordSuccessOpen] = useState(false);
  const [isMovingToLogin, setIsMovingToLogin] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [isRequestingEmail, setIsRequestingEmail] = useState(false);
  const [isConfirmingEmail, setIsConfirmingEmail] = useState(false);
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login?redirect=/account");
    }
  }, [isLoading, router, user]);

  if (isLoading || !user) {
    return <div className="py-12 text-center text-sm text-slate-500">계정 정보를 불러오는 중입니다.</div>;
  }

  const verifiedAt = formatDate(user.emailVerifiedAt);

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    const firstEmptyPasswordInput = [
      { value: currentPassword, ref: currentPasswordRef },
      { value: newPassword, ref: newPasswordRef },
      { value: confirmNewPassword, ref: confirmNewPasswordRef },
    ].find((field) => !field.value);

    if (firstEmptyPasswordInput) {
      setPasswordError("모든 값을 입력해 주세요.");
      firstEmptyPasswordInput.ref.current?.focus();
      return;
    }

    setIsChangingPassword(true);

    try {
      await api.patch<UserResponse>("/users/me/password", {
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setIsPasswordSuccessOpen(true);
    } catch (error) {
      setPasswordError(getApiMessage(error, "비밀번호 변경 중 오류가 발생했습니다."));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const moveToLoginAfterPasswordChange = async () => {
    setIsMovingToLogin(true);

    try {
      await logout();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  const requestEmailVerification = async () => {
    setEmailMessage(null);
    setEmailError(null);
    setDevCode(null);
    setIsRequestingEmail(true);

    try {
      const response = await api.post<EmailVerificationResponse>("/users/me/email-verification");
      setEmailMessage(response.data.message ?? "인증 코드가 발급되었습니다.");
      setDevCode(response.data.devCode ?? null);

      if (response.data.alreadyVerified) {
        await refreshUser();
      }
    } catch (error) {
      setEmailError(getApiMessage(error, "이메일 인증 요청 중 오류가 발생했습니다."));
    } finally {
      setIsRequestingEmail(false);
    }
  };

  const confirmEmailVerification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailMessage(null);
    setEmailError(null);
    setIsConfirmingEmail(true);

    try {
      const response = await api.post<UserResponse>("/users/me/email-verification/confirm", {
        code: verificationCode,
      });
      setEmailMessage(response.data.message ?? "이메일 인증이 완료되었습니다.");
      setVerificationCode("");
      setDevCode(null);
      await refreshUser();
    } catch (error) {
      setEmailError(getApiMessage(error, "이메일 인증 확인 중 오류가 발생했습니다."));
    } finally {
      setIsConfirmingEmail(false);
    }
  };

  const withdraw = async () => {
    setWithdrawalError(null);
    setIsWithdrawing(true);

    try {
      await api.delete("/users/me");
      await logout();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setWithdrawalError(getApiMessage(error, "회원 탈퇴 중 오류가 발생했습니다."));
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-950">계정관리</h1>
        <p className="mt-2 text-sm text-slate-500">로그인 보안과 이메일 인증 상태를 관리합니다.</p>
      </div>

      <section className="border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">이메일 인증</h2>
            <p className="mt-1 text-sm text-slate-500">{user.email}</p>
          </div>
          <span
            className={`inline-flex w-fit rounded px-2.5 py-1 text-xs font-bold ${
              verifiedAt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {verifiedAt ? "인증 완료" : "미인증"}
          </span>
        </div>

        <div className="mt-4 space-y-4">
          {verifiedAt ? (
            <StatusMessage type="success">이메일 인증이 {verifiedAt}에 완료되었습니다.</StatusMessage>
          ) : (
            <>
              <p className="text-sm leading-6 text-slate-600">
                인증 코드를 요청한 뒤 이메일로 받은 6자리 코드를 입력해 주세요.
              </p>
              <button
                type="button"
                onClick={requestEmailVerification}
                disabled={isRequestingEmail}
                className="button-secondary sm:w-auto"
              >
                {isRequestingEmail ? "요청 중" : "인증 코드 요청"}
              </button>
              <form
                onSubmit={confirmEmailVerification}
                className="grid grid-cols-[minmax(0,1fr)_112px] gap-3 sm:grid-cols-[minmax(0,220px)_112px]"
              >
                <div>
                  <label htmlFor="email-code" className="sr-only">
                    이메일 인증 코드
                  </label>
                  <input
                    id="email-code"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="input-style"
                    placeholder="6자리 코드"
                  />
                </div>
                <button type="submit" disabled={isConfirmingEmail} className="button-primary px-3">
                  {isConfirmingEmail ? "확인 중" : "인증 확인"}
                </button>
              </form>
            </>
          )}
          {devCode && <StatusMessage type="info">개발 환경 인증 코드: {devCode}</StatusMessage>}
          {emailMessage && <StatusMessage type="success">{emailMessage}</StatusMessage>}
          {emailError && <StatusMessage type="error">{emailError}</StatusMessage>}
        </div>
      </section>

      <section className="border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black text-slate-950">비밀번호 변경</h2>
        <form onSubmit={changePassword} className="mt-4 grid gap-4">
          <PasswordInput
            id="current-password"
            label="현재 비밀번호"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
            inputRef={currentPasswordRef}
            disabled={isChangingPassword}
          />
          <PasswordInput
            id="new-password"
            label="새 비밀번호"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            inputRef={newPasswordRef}
            disabled={isChangingPassword}
          />
          <PasswordInput
            id="confirm-new-password"
            label="새 비밀번호 확인"
            value={confirmNewPassword}
            onChange={setConfirmNewPassword}
            autoComplete="new-password"
            inputRef={confirmNewPasswordRef}
            disabled={isChangingPassword}
          />
          {passwordMessage && <StatusMessage type="success">{passwordMessage}</StatusMessage>}
          {passwordError && <StatusMessage type="error">{passwordError}</StatusMessage>}
          <button type="submit" disabled={isChangingPassword} className="button-primary sm:w-auto">
            {isChangingPassword ? "변경 중" : "비밀번호 변경"}
          </button>
        </form>
      </section>

      <section className="border border-red-200 bg-white p-5">
        <h2 className="text-lg font-black text-red-700">회원 탈퇴</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          탈퇴하면 계정이 비활성화되어 더 이상 로그인할 수 없습니다.
        </p>
        <button
          type="button"
          onClick={() => setIsWithdrawalOpen(true)}
          className="mt-4 inline-flex items-center rounded border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        >
          회원 탈퇴
        </button>
      </section>

      {isWithdrawalOpen && (
        <Modal onClose={() => setIsWithdrawalOpen(false)}>
          <h2 className="text-xl font-black text-slate-950">회원 탈퇴 전 확인해 주세요</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p>탈퇴 후에는 현재 계정으로 로그인하거나 계정 정보를 복구할 수 없습니다.</p>
            <p>
              작성한 게시글과 댓글은 커뮤니티 흐름 유지를 위해 자동 삭제되지 않습니다. 개인정보가 포함된
              게시글이나 댓글은 탈퇴 전에 직접 수정하거나 삭제해 주세요.
            </p>
            <p>정말로 회원 탈퇴를 진행하시겠습니까?</p>
          </div>
          {withdrawalError && <div className="mt-4"><StatusMessage type="error">{withdrawalError}</StatusMessage></div>}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setIsWithdrawalOpen(false)}
              disabled={isWithdrawing}
              className="rounded border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              아니오
            </button>
            <button
              type="button"
              onClick={withdraw}
              disabled={isWithdrawing}
              className="rounded bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-red-300"
            >
              {isWithdrawing ? "탈퇴 처리 중" : "예, 탈퇴합니다"}
            </button>
          </div>
        </Modal>
      )}

      {isPasswordSuccessOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded bg-white p-6 shadow-xl">
            <h2 className="text-xl font-black text-slate-950">비밀번호 변경 완료</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              비밀번호 변경이 완료되었습니다. 보안을 위해 다시 로그인해 주세요.
            </p>
            <button
              type="button"
              onClick={moveToLoginAfterPasswordChange}
              disabled={isMovingToLogin}
              className="button-primary mt-6"
            >
              {isMovingToLogin ? "이동 중" : "로그인 화면으로 이동"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
