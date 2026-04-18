'use client';

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

const SignUpModal = ({ onClose }: { onClose: () => void }) => {
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
      await api.post("/users", {
        email: data.email,
        username: data.username,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });

      reset();
      window.alert("회원가입이 완료되었습니다.");
      onClose();
    } catch (error: unknown) {
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
          setSubmitError(responseData.message);
          return;
        }
      }

      setSubmitError("회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-email" className="text-sm font-medium">
            이메일
          </label>
          <input
            id="signup-email"
            type="email"
            maxLength={SIGN_UP_LIMITS.email}
            {...register("email")}
            className="rounded-md border border-gray-300 p-2 focus:outline-blue-500"
            placeholder="example@test.com"
          />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-username" className="text-sm font-medium">
            아이디
          </label>
          <input
            id="signup-username"
            type="text"
            maxLength={SIGN_UP_LIMITS.username}
            {...register("username")}
            className="rounded-md border border-gray-300 p-2 focus:outline-blue-500"
            placeholder="gymchelin_user"
          />
          {errors.username && (
            <p className="text-xs text-red-500">{errors.username.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-password" className="text-sm font-medium">
            비밀번호
          </label>
          <input
            id="signup-password"
            type="password"
            maxLength={SIGN_UP_LIMITS.password}
            {...register("password")}
            className="rounded-md border border-gray-300 p-2 focus:outline-blue-500"
          />
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-confirm-password" className="text-sm font-medium">
            비밀번호 확인
          </label>
          <input
            id="signup-confirm-password"
            type="password"
            maxLength={SIGN_UP_LIMITS.password}
            {...register("confirmPassword")}
            className="rounded-md border border-gray-300 p-2 focus:outline-blue-500"
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        {submitError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-4 w-full rounded-md bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {isSubmitting ? "가입 중..." : "회원가입"}
        </button>
      </form>
    </Modal>
  );
};

export default SignUpModal;
