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

export default function SignUpModal({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: (username: string) => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);

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
          <input
            id="signup-password"
            type="password"
            maxLength={SIGN_UP_LIMITS.password}
            {...register("password")}
            className="input-style"
          />
          {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-confirm-password" className="text-sm font-medium text-slate-700">
            비밀번호 확인
          </label>
          <input
            id="signup-confirm-password"
            type="password"
            maxLength={SIGN_UP_LIMITS.password}
            {...register("confirmPassword")}
            className="input-style"
          />
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
