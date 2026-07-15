"use client";

// 이메일 인증 후 비밀번호를 재설정하는 폼을 제공한다.
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import api from "@/lib/api";
import Modal from "../_components/modalComponent";
import {
  findPasswordSchema,
  type FindPasswordFormData,
} from "./find-account-schema";

type ApiMessageResponse = {
  message?: string;
};

type ApiErrorMessage = {
  message: string;
  status?: number;
};

const FIND_PASSWORD_REQUEST_TIMEOUT_MS = 30_000;

const getApiErrorMessage = (error: unknown): ApiErrorMessage => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")
  ) {
    return {
      message: "요청 처리에 시간이 걸리고 있습니다. 이메일 수신 여부를 확인해 주세요.",
    };
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response
  ) {
    const responseData = error.response.data;
    const status =
      "status" in error.response && typeof error.response.status === "number"
        ? error.response.status
        : undefined;
    if (
      typeof responseData === "object" &&
      responseData !== null &&
      "message" in responseData &&
      typeof responseData.message === "string"
    ) {
      return {
        message: responseData.message,
        status,
      };
    }
  }

  return {
    message: "비밀번호 찾기 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  };
};

export default function FindPasswordComponent({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FindPasswordFormData>({
    resolver: zodResolver(findPasswordSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: FindPasswordFormData) => {
    setMessage(null);
    setSubmitError(null);
    setAlertMessage(null);

    try {
      const response = await api.post<ApiMessageResponse>("/auth/find-password", data, {
        timeout: FIND_PASSWORD_REQUEST_TIMEOUT_MS,
      });
      setMessage(response.data.message ?? "이메일로 임시 비밀번호 안내를 요청했습니다.");
      reset();
    } catch (error: unknown) {
      const apiError = getApiErrorMessage(error);
      if (apiError.status === 404) {
        setAlertMessage(apiError.message);
        return;
      }

      setSubmitError(apiError.message);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-5 text-xl font-black text-slate-950">비밀번호 찾기</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm leading-6 text-slate-600">
          가입한 이메일과 아이디가 일치하면 임시 비밀번호를 이메일로 받을 수 있습니다.
        </p>
        <div>
          <label htmlFor="find-password-email" className="mb-1.5 block text-sm font-medium text-slate-700">
            이메일
          </label>
          <input
            id="find-password-email"
            type="email"
            autoComplete="email"
            disabled={isSubmitting}
            className="input-style"
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="find-password-username" className="mb-1.5 block text-sm font-medium text-slate-700">
            아이디
          </label>
          <input
            id="find-password-username"
            type="text"
            autoComplete="username"
            disabled={isSubmitting}
            className="input-style"
            placeholder="gymchelin_user"
            {...register("username")}
          />
          {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>}
        </div>
        {message && <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        {submitError && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}
        <button type="submit" disabled={isSubmitting} className="button-primary">
          {isSubmitting ? "요청 중" : "임시 비밀번호 받기"}
        </button>
        {isSubmitting && (
          <div className="loading-bar" role="progressbar" aria-label="비밀번호 찾기 요청 처리 중">
            <span className="loading-bar-fill" />
          </div>
        )}
      </form>
      {alertMessage && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded bg-white/80 px-4 backdrop-blur-sm">
          <div role="alertdialog" aria-modal="true" className="w-full rounded border border-red-100 bg-white p-5 shadow-lg">
            <h3 className="text-base font-bold text-slate-950">정보를 확인해 주세요</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{alertMessage}</p>
            <button type="button" onClick={() => setAlertMessage(null)} className="button-primary mt-5">
              확인
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
