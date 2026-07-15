// 아이디 찾기와 비밀번호 재설정 폼의 입력 검증 규칙이다.
import { z } from "zod";
import { SIGN_UP_LIMITS } from "./sign-up-schema";

const emailSchema = z
  .string()
  .trim()
  .min(1, "이메일을 입력해 주세요.")
  .max(SIGN_UP_LIMITS.email, `이메일은 최대 ${SIGN_UP_LIMITS.email}자까지 입력할 수 있습니다.`)
  .email("올바른 이메일 형식을 입력해 주세요.");

export const findIdSchema = z.object({
  email: emailSchema,
});

export const findPasswordSchema = z.object({
  email: emailSchema,
  username: z
    .string()
    .trim()
    .min(1, "아이디를 입력해 주세요.")
    .max(SIGN_UP_LIMITS.username, `아이디는 최대 ${SIGN_UP_LIMITS.username}자까지 입력할 수 있습니다.`)
    .regex(/^[A-Za-z0-9_]+$/, "아이디는 영문, 숫자, 밑줄(_)만 사용할 수 있습니다."),
});

export type FindIdFormData = z.infer<typeof findIdSchema>;
export type FindPasswordFormData = z.infer<typeof findPasswordSchema>;
