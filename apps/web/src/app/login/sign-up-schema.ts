// 회원 가입 입력값의 길이 제한과 검증 규칙을 정의한다.
import { z } from "zod";

export const SIGN_UP_LIMITS = {
  email: 120,
  username: 30,
  password: 72,
} as const;

const ALLOWED_EMAIL_TLDS = new Set([
  "com",
  "net",
  "org",
  "kr",
  "co",
  "io",
  "dev",
  "app",
  "ai",
  "me",
  "edu",
  "gov",
]);

const hasAllowedEmailTld = (email: string) => {
  const domain = email.split("@")[1];
  const lastLabel = domain?.split(".").pop()?.toLowerCase();
  return !!lastLabel && ALLOWED_EMAIL_TLDS.has(lastLabel);
};

export const signUpSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "이메일을 입력해 주세요.")
      .max(SIGN_UP_LIMITS.email, `이메일은 최대 ${SIGN_UP_LIMITS.email}자까지 입력할 수 있습니다.`)
      .email("올바른 이메일 형식을 입력해 주세요.")
      .refine((value) => hasAllowedEmailTld(value), "지원하지 않는 이메일 도메인입니다."),
    username: z
      .string()
      .trim()
      .min(1, "아이디를 입력해 주세요.")
      .max(SIGN_UP_LIMITS.username, `아이디는 최대 ${SIGN_UP_LIMITS.username}자까지 입력할 수 있습니다.`)
      .regex(/^[A-Za-z0-9_]+$/, "아이디는 영문, 숫자, 밑줄(_)만 사용할 수 있습니다."),
    nickname: z
      .string()
      .trim()
      .max(SIGN_UP_LIMITS.username, `닉네임은 최대 ${SIGN_UP_LIMITS.username}자까지 입력할 수 있습니다.`)
      .optional()
      .or(z.literal("")),
    password: z
      .string()
      .min(8, "비밀번호는 8자 이상이어야 합니다.")
      .max(SIGN_UP_LIMITS.password, `비밀번호는 최대 ${SIGN_UP_LIMITS.password}자까지 입력할 수 있습니다.`),
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력해 주세요."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "비밀번호가 일치하지 않습니다.",
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;
