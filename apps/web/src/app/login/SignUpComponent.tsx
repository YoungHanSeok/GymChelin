"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import api from "@/lib/api";
import Modal from "../_components/modalComponent";
import {
  SIGN_UP_LIMITS,
  signUpSchema,
  type SignUpFormData,
} from "./sign-up-schema";

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

  return "회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
};

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

export default function SignUpModal({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: (username: string) => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: SignUpFormData) => {
    setSubmitError(null);

    try {
      await api.post("/auth/signup", {
        email: data.email,
        username: data.username,
        nickname: data.nickname || data.username,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });

      reset();
      onComplete(data.username);
    } catch (error: unknown) {
      setSubmitError(getApiMessage(error));
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-5 text-xl font-black text-slate-950">회원가입</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-email" className="text-sm font-medium text-slate-700">
            이메일
          </label>
          <input
            id="signup-email"
            type="email"
            maxLength={SIGN_UP_LIMITS.email}
            {...register("email")}
            className="input-style"
            placeholder="example@gymchelin.com"
          />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-username" className="text-sm font-medium text-slate-700">
            아이디
          </label>
          <input
            id="signup-username"
            type="text"
            maxLength={SIGN_UP_LIMITS.username}
            {...register("username")}
            className="input-style"
            placeholder="gymchelin_user"
          />
          {errors.username && <p className="text-xs text-red-600">{errors.username.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-nickname" className="text-sm font-medium text-slate-700">
            닉네임
          </label>
          <input
            id="signup-nickname"
            type="text"
            maxLength={SIGN_UP_LIMITS.username}
            {...register("nickname")}
            className="input-style"
            placeholder="비워두면 아이디를 사용합니다"
          />
          {errors.nickname && <p className="text-xs text-red-600">{errors.nickname.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-password" className="text-sm font-medium text-slate-700">
            비밀번호
          </label>
          <div className="relative">
            <input
              id="signup-password"
              type={isPasswordVisible ? "text" : "password"}
              maxLength={SIGN_UP_LIMITS.password}
              disabled={isSubmitting}
              {...register("password")}
              className="input-style pr-11"
            />
            <button
              type="button"
              onClick={() => setIsPasswordVisible((current) => !current)}
              disabled={isSubmitting}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={isPasswordVisible ? "비밀번호 숨기기" : "비밀번호 보기"}
            >
              <EyeIcon isVisible={isPasswordVisible} />
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-confirm-password" className="text-sm font-medium text-slate-700">
            비밀번호 확인
          </label>
          <div className="relative">
            <input
              id="signup-confirm-password"
              type={isConfirmPasswordVisible ? "text" : "password"}
              maxLength={SIGN_UP_LIMITS.password}
              disabled={isSubmitting}
              {...register("confirmPassword")}
              className="input-style pr-11"
            />
            <button
              type="button"
              onClick={() => setIsConfirmPasswordVisible((current) => !current)}
              disabled={isSubmitting}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={isConfirmPasswordVisible ? "비밀번호 확인 숨기기" : "비밀번호 확인 보기"}
            >
              <EyeIcon isVisible={isConfirmPasswordVisible} />
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        {submitError && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>
        )}

        <button type="submit" disabled={isSubmitting} className="button-primary">
          {isSubmitting ? "가입 중" : "회원가입"}
        </button>
      </form>
    </Modal>
  );
}
