"use client";

// 이메일 인증으로 아이디를 찾는 폼을 제공한다.
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import api from "@/lib/api";
import Modal from "../_components/modalComponent";
import {
  findIdSchema,
  type FindIdFormData,
} from "./find-account-schema";

type ApiMessageResponse = {
  message?: string;
};

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

  return "아이디 찾기 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
};

export default function FindIdComponent({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FindIdFormData>({
    resolver: zodResolver(findIdSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: FindIdFormData) => {
    setMessage(null);
    setSubmitError(null);

    try {
      const response = await api.post<ApiMessageResponse>("/auth/find-id", data);
      setMessage(response.data.message ?? "이메일로 아이디 안내를 요청했습니다.");
      reset();
    } catch (error: unknown) {
      setSubmitError(getApiMessage(error));
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-5 text-xl font-black text-slate-950">아이디 찾기</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm leading-6 text-slate-600">
          가입한 이메일을 입력하면 아이디 안내 메일을 받을 수 있습니다.
        </p>
        <div>
          <label htmlFor="find-id-email" className="mb-1.5 block text-sm font-medium text-slate-700">
            이메일
          </label>
          <input
            id="find-id-email"
            type="email"
            autoComplete="email"
            disabled={isSubmitting}
            className="input-style"
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        {message && <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        {submitError && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}
        <button type="submit" disabled={isSubmitting} className="button-primary">
          {isSubmitting ? "요청 중" : "안내 메일 받기"}
        </button>
        {isSubmitting && (
          <div className="loading-bar" role="progressbar" aria-label="아이디 찾기 요청 처리 중">
            <span className="loading-bar-fill" />
          </div>
        )}
      </form>
    </Modal>
  );
}
