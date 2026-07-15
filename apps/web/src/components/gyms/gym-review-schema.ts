// 헬스장 리뷰의 별점과 내용 입력 규칙을 정의한다.
import { z } from "zod";

export const GYM_REVIEW_CONTENT_MAX_LENGTH = 2000;

export const gymReviewSchema = z.object({
  rating: z
    .number()
    .int("별점은 정수로 선택해 주세요.")
    .min(1, "별점을 선택해 주세요.")
    .max(5, "별점은 5점까지 선택할 수 있습니다."),
  content: z
    .string()
    .trim()
    .min(1, "리뷰 내용을 입력해 주세요.")
    .max(GYM_REVIEW_CONTENT_MAX_LENGTH, `리뷰는 최대 ${GYM_REVIEW_CONTENT_MAX_LENGTH}자까지 입력할 수 있습니다.`),
});

export type GymReviewFormValues = z.infer<typeof gymReviewSchema>;
