"use client";

// 선택한 업체의 리뷰 작성, 댓글과 답글, 신고 상호작용을 처리한다.
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import Modal from "@/app/_components/modalComponent";
import api from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import { authorName } from "@/lib/community-types";
import type {
  GymPlaceLive,
  GymReview,
  GymReviewComment,
  GymReviewSummary,
} from "@/lib/gym-types";
import {
  GYM_REVIEW_CONTENT_MAX_LENGTH,
  gymReviewSchema,
  type GymReviewFormValues,
} from "./gym-review-schema";

type GymReviewPanelProps = {
  place: GymPlaceLive | null;
  onSummaryChange: (providerPlaceId: string, avgRating: number, reviewCount: number) => void;
};

type DeleteCommentTarget = {
  reviewId: number;
  commentId: number;
};

const formatDate = (value: string) => dayjs(value).format("YYYY.MM.DD HH:mm");

const getReportErrorMessage = (error: unknown) => {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
    if (Array.isArray(message) && message.length > 0) {
      return message.join(" ");
    }
  }

  return "신고를 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.";
};

const addReply = (
  comments: GymReviewComment[],
  parentId: number,
  reply: GymReviewComment,
): GymReviewComment[] =>
  comments.map((comment) =>
    comment.id === parentId
      ? { ...comment, replies: [...(comment.replies ?? []), reply] }
      : { ...comment, replies: addReply(comment.replies ?? [], parentId, reply) },
  );

const markCommentDeleted = (comments: GymReviewComment[], commentId: number): GymReviewComment[] =>
  comments.map((comment) =>
    comment.id === commentId
      ? { ...comment, content: "", status: "DELETED", isDeleted: true }
      : { ...comment, replies: markCommentDeleted(comment.replies ?? [], commentId) },
  );

const countComments = (comments: GymReviewComment[]): number =>
  comments.reduce((count, comment) => count + 1 + countComments(comment.replies ?? []), 0);

function RatingStars({ rating }: { rating: number }) {
  return (
    <span aria-label={`별점 ${rating}점`} className="inline-flex text-amber-500">
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} aria-hidden="true" className={index < rating ? "text-amber-500" : "text-slate-300"}>
          ★
        </span>
      ))}
    </span>
  );
}

function CommentForm({
  value,
  placeholder,
  submitLabel,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: string;
  placeholder: string;
  submitLabel: string;
  isSubmitting: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        maxLength={2000}
        placeholder={placeholder}
        className="min-h-24 w-full resize-y rounded border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-emerald-500"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-500 disabled:opacity-60"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !value.trim()}
          className="rounded bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? "등록 중" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function GymReviewCommentItem({
  reviewId,
  comment,
  depth,
  currentUserId,
  replyDrafts,
  isSubmitting,
  onOpenReply,
  onChangeReply,
  onCloseReply,
  onSubmitReply,
  onDelete,
}: {
  reviewId: number;
  comment: GymReviewComment;
  depth: number;
  currentUserId?: number;
  replyDrafts: Record<number, string>;
  isSubmitting: boolean;
  onOpenReply: (commentId: number) => void;
  onChangeReply: (commentId: number, value: string) => void;
  onCloseReply: (commentId: number) => void;
  onSubmitReply: (reviewId: number, commentId: number, event: FormEvent<HTMLFormElement>) => void;
  onDelete: (target: DeleteCommentTarget) => void;
}) {
  const isDeleted = Boolean(comment.isDeleted || comment.status === "DELETED");
  const isBlinded = comment.status === "BLINDED";
  const isOwnComment = Boolean(currentUserId && comment.author?.id === currentUserId);
  const isReplyOpen = Object.prototype.hasOwnProperty.call(replyDrafts, comment.id);
  const isReply = depth > 0;
  const depthClass = depth === 0
    ? ""
    : depth === 1
      ? "ml-3 sm:ml-5"
      : depth === 2
        ? "ml-6 sm:ml-10"
        : "ml-8 sm:ml-14";

  return (
    <>
      <article
        className={`rounded-lg border px-3 py-3 ${depthClass} ${
          isReply
            ? "border-emerald-200 border-l-4 bg-emerald-50/60"
            : "border-slate-200 bg-slate-50/80"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span
            className={`rounded-full px-2 py-0.5 font-bold ${
              isReply ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
            }`}
          >
            {isReply ? "답글" : "댓글"}
          </span>
          <span className="font-semibold text-slate-700">{authorName(comment.author)}</span>
          <span>{formatDate(comment.createdAt)}</span>
        </div>
        <p className={`mt-1.5 whitespace-pre-wrap text-sm leading-6 ${isDeleted || isBlinded ? "text-slate-400" : "text-slate-700"}`}>
          {isDeleted ? "삭제된 댓글입니다." : isBlinded ? "관리자에 의해 가려진 댓글입니다." : comment.content}
        </p>

        {!isDeleted && !isBlinded && (
          <div className="mt-2 flex items-center gap-3 text-xs font-medium text-slate-500">
            <button type="button" onClick={() => onOpenReply(comment.id)} className="hover:text-emerald-700">
              답글
            </button>
            {isOwnComment && (
              <button type="button" onClick={() => onDelete({ reviewId, commentId: comment.id })} className="hover:text-red-700">
                삭제
              </button>
            )}
          </div>
        )}

        {isReplyOpen && !isDeleted && !isBlinded && (
          <div className="mt-3">
            <CommentForm
              value={replyDrafts[comment.id] ?? ""}
              placeholder="답글을 입력해 주세요."
              submitLabel="답글 등록"
              isSubmitting={isSubmitting}
              onChange={(value) => onChangeReply(comment.id, value)}
              onSubmit={(event) => onSubmitReply(reviewId, comment.id, event)}
              onCancel={() => onCloseReply(comment.id)}
            />
          </div>
        )}
      </article>

      {(comment.replies ?? []).map((reply) => (
        <GymReviewCommentItem
          key={reply.id}
          reviewId={reviewId}
          comment={reply}
          depth={depth + 1}
          currentUserId={currentUserId}
          replyDrafts={replyDrafts}
          isSubmitting={isSubmitting}
          onOpenReply={onOpenReply}
          onChangeReply={onChangeReply}
          onCloseReply={onCloseReply}
          onSubmitReply={onSubmitReply}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

export default function GymReviewPanel({ place, onSummaryChange }: GymReviewPanelProps) {
  const { user, isLoading: isAuthLoading } = useAuthSession();
  const [summary, setSummary] = useState<GymReviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(place));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [openCommentReviewId, setOpenCommentReviewId] = useState<number | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [collapsedCommentReviewIds, setCollapsedCommentReviewIds] = useState<Set<number>>(() => new Set());
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [deleteCommentTarget, setDeleteCommentTarget] = useState<DeleteCommentTarget | null>(null);
  const [reportReview, setReportReview] = useState<GymReview | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportErrorMessage, setReportErrorMessage] = useState<string | null>(null);
  const [isDialogSubmitting, setIsDialogSubmitting] = useState(false);
  const reviewRequestIdRef = useRef(0);
  const activeProviderPlaceIdRef = useRef<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting: isReviewSubmitting },
  } = useForm<GymReviewFormValues>({
    resolver: zodResolver(gymReviewSchema),
    defaultValues: { rating: 0, content: "" },
    mode: "onBlur",
  });

  const selectedRating = watch("rating");
  const providerPlaceId = place?.providerPlaceId ?? null;
  const currentUserReview = useMemo(
    () => summary?.reviews.find((review) => review.user?.id === user?.id),
    [summary?.reviews, user?.id],
  );

  useEffect(() => {
    activeProviderPlaceIdRef.current = providerPlaceId;

    return () => {
      activeProviderPlaceIdRef.current = null;
    };
  }, [providerPlaceId]);

  const loadReviews = useCallback(async () => {
    const requestId = ++reviewRequestIdRef.current;
    setSummary(null);
    reset({ rating: 0, content: "" });

    if (!providerPlaceId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.get<GymReviewSummary>(`/gyms/${encodeURIComponent(providerPlaceId)}/reviews`);
      if (requestId !== reviewRequestIdRef.current) {
        return;
      }

      setSummary(response.data);
      onSummaryChange(providerPlaceId, response.data.avgRating, response.data.reviewCount);
    } catch {
      if (requestId !== reviewRequestIdRef.current) {
        return;
      }

      setSummary(null);
      setErrorMessage("리뷰를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      if (requestId === reviewRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [onSummaryChange, providerPlaceId, reset]);

  useEffect(() => {
    setNoticeMessage(null);
    setOpenCommentReviewId(null);
    setCommentDrafts({});
    setReplyDrafts({});
    setCollapsedCommentReviewIds(new Set());
    void loadReviews();

    return () => {
      reviewRequestIdRef.current += 1;
    };
  }, [loadReviews]);

  useEffect(() => {
    reset({
      rating: currentUserReview?.rating ?? 0,
      content: currentUserReview?.content ?? "",
    });
  }, [
    currentUserReview?.content,
    currentUserReview?.id,
    currentUserReview?.rating,
    providerPlaceId,
    reset,
    user?.id,
  ]);

  const requireLogin = () => {
    if (user) {
      return true;
    }

    setNoticeMessage("로그인 후 사용할 수 있습니다.");
    return false;
  };

  const submitReview = async (values: GymReviewFormValues) => {
    if (!place || !requireLogin()) {
      return;
    }

    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const response = await api.post<GymReviewSummary>(
        `/gyms/${encodeURIComponent(place.providerPlaceId)}/reviews`,
        {
          rating: values.rating,
          content: values.content.trim(),
          reviewTargetToken: place.reviewTargetToken,
        },
      );
      if (activeProviderPlaceIdRef.current !== place.providerPlaceId) {
        return;
      }

      setSummary(response.data);
      onSummaryChange(place.providerPlaceId, response.data.avgRating, response.data.reviewCount);
      setNoticeMessage(currentUserReview ? "리뷰가 수정되었습니다." : "리뷰가 등록되었습니다.");
    } catch (error) {
      if (activeProviderPlaceIdRef.current !== place.providerPlaceId) {
        return;
      }

      setErrorMessage(
        isAxiosError(error) && error.response?.status === 401
          ? "로그인 후 리뷰를 작성할 수 있습니다."
          : "리뷰를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
  };

  const updateReviewComments = (
    reviewId: number,
    updater: (comments: GymReviewComment[]) => GymReviewComment[],
  ) => {
    setSummary((current) =>
      current
        ? {
            ...current,
            reviews: current.reviews.map((review) =>
              review.id === reviewId ? { ...review, comments: updater(review.comments ?? []) } : review,
            ),
          }
        : current,
    );
  };

  const showReviewComments = (reviewId: number) => {
    setCollapsedCommentReviewIds((current) => {
      if (!current.has(reviewId)) {
        return current;
      }

      const next = new Set(current);
      next.delete(reviewId);
      return next;
    });
  };

  const toggleReviewComments = (reviewId: number) => {
    setCollapsedCommentReviewIds((current) => {
      const next = new Set(current);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
  };

  const submitComment = async (reviewId: number, content: string, parentId?: number) => {
    if (!requireLogin()) {
      return;
    }

    const nextContent = content.trim();
    if (!nextContent) {
      return;
    }

    setIsCommentSubmitting(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const response = await api.post<GymReviewComment>(`/gyms/reviews/${reviewId}/comments`, {
        content: nextContent,
        ...(parentId ? { parentId } : {}),
      });

      updateReviewComments(reviewId, (comments) =>
        parentId ? addReply(comments, parentId, response.data) : [...comments, response.data],
      );
      showReviewComments(reviewId);
      if (parentId) {
        setReplyDrafts((current) => {
          const next = { ...current };
          delete next[parentId];
          return next;
        });
      } else {
        setCommentDrafts((current) => ({ ...current, [reviewId]: "" }));
        setOpenCommentReviewId(null);
      }
      setNoticeMessage("댓글이 등록되었습니다.");
    } catch {
      setErrorMessage("댓글을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const submitDeleteComment = async () => {
    if (!deleteCommentTarget) {
      return;
    }

    setIsDialogSubmitting(true);
    setErrorMessage(null);

    try {
      await api.delete(
        `/gyms/reviews/${deleteCommentTarget.reviewId}/comments/${deleteCommentTarget.commentId}`,
      );
      updateReviewComments(deleteCommentTarget.reviewId, (comments) =>
        markCommentDeleted(comments, deleteCommentTarget.commentId),
      );
      setDeleteCommentTarget(null);
      setNoticeMessage("댓글이 삭제되었습니다.");
    } catch {
      setErrorMessage("댓글을 삭제하지 못했습니다.");
    } finally {
      setIsDialogSubmitting(false);
    }
  };

  const submitReport = async () => {
    if (!reportReview || !reportReason.trim()) {
      return;
    }

    setIsDialogSubmitting(true);
    setErrorMessage(null);
    setReportErrorMessage(null);

    try {
      await api.post("/reports", {
        targetType: "GYM_REVIEW",
        targetId: reportReview.id,
        reason: reportReason.trim(),
      });
      setReportReview(null);
      setReportReason("");
      setReportErrorMessage(null);
      setNoticeMessage("신고가 접수되었습니다.");
    } catch (error) {
      setReportErrorMessage(getReportErrorMessage(error));
    } finally {
      setIsDialogSubmitting(false);
    }
  };

  if (!place) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <h2 className="text-lg font-bold text-slate-950">헬스장 리뷰</h2>
        <p className="mt-2 text-sm text-slate-600">지도 마커나 목록에서 업체를 선택하면 리뷰를 확인할 수 있습니다.</p>
      </section>
    );
  }

  const reviews = summary?.reviews ?? [];
  const avgRating = summary?.avgRating ?? place.avgRating;
  const reviewCount = summary?.reviewCount ?? place.reviewCount;

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <header className="border-b border-slate-200 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-black text-slate-950">{place.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{place.roadAddressName || place.addressName || "주소 정보 없음"}</p>
              {place.phone && <p className="mt-1 text-sm text-slate-500">{place.phone}</p>}
            </div>
            <div className="shrink-0 text-right">
              <strong className="block text-2xl font-black text-slate-950">{avgRating.toFixed(1)}</strong>
              <span className="text-xs text-slate-500">리뷰 {reviewCount}개</span>
            </div>
          </div>
          {place.placeUrl && (
            <a
              href={place.placeUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
            >
              카카오맵에서 보기
            </a>
          )}
        </header>

        <div className="border-b border-slate-200 p-5">
          <h3 className="text-base font-bold text-slate-950">{currentUserReview ? "내 리뷰 수정" : "리뷰 작성"}</h3>
          {isLoading ? (
            <p className="mt-3 text-sm text-slate-500">리뷰 정보를 불러오는 중입니다.</p>
          ) : isAuthLoading ? (
            <p className="mt-3 text-sm text-slate-500">로그인 상태를 확인하는 중입니다.</p>
          ) : !user ? (
            <p className="mt-3 text-sm text-slate-600">
              리뷰 작성은 로그인 후 가능합니다.{" "}
              <Link href="/login" className="font-semibold text-emerald-700 hover:underline">
                로그인하기
              </Link>
            </p>
          ) : (
            <form onSubmit={handleSubmit(submitReview)} className="mt-4 space-y-4">
              <fieldset>
                <legend className="text-sm font-semibold text-slate-700">별점</legend>
                <Controller
                  control={control}
                  name="rating"
                  render={({ field }) => (
                    <div className="mt-2 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <label key={rating} className="cursor-pointer">
                          <input
                            ref={rating === 1 ? field.ref : undefined}
                            type="radio"
                            name={field.name}
                            value={rating}
                            checked={field.value === rating}
                            onBlur={field.onBlur}
                            onChange={() => field.onChange(rating)}
                            className="sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className={`text-3xl ${rating <= selectedRating ? "text-amber-500" : "text-slate-300"}`}
                          >
                            ★
                          </span>
                          <span className="sr-only">{rating}점</span>
                        </label>
                      ))}
                    </div>
                  )}
                />
                {errors.rating && <p className="mt-1 text-sm text-red-700">{errors.rating.message}</p>}
              </fieldset>

              <div>
                <label htmlFor="gym-review-content" className="text-sm font-semibold text-slate-700">
                  내용
                </label>
                <textarea
                  id="gym-review-content"
                  rows={5}
                  maxLength={GYM_REVIEW_CONTENT_MAX_LENGTH}
                  {...register("content")}
                  className="mt-2 min-h-32 w-full resize-y rounded border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-emerald-500"
                  placeholder="시설, 기구, 청결도, 혼잡도 등 직접 이용한 경험을 알려 주세요."
                />
                {errors.content && <p className="mt-1 text-sm text-red-700">{errors.content.message}</p>}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isReviewSubmitting}
                  className="rounded bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isReviewSubmitting ? "저장 중" : currentUserReview ? "리뷰 수정" : "리뷰 등록"}
                </button>
              </div>
            </form>
          )}
        </div>

        {(noticeMessage || errorMessage) && (
          <div className="border-b border-slate-200 px-5 py-3">
            {noticeMessage && <p role="status" className="text-sm font-medium text-emerald-700">{noticeMessage}</p>}
            {errorMessage && <p role="alert" className="text-sm font-medium text-red-700">{errorMessage}</p>}
          </div>
        )}

        <div className="p-5">
          <h3 className="text-base font-bold text-slate-950">회원 리뷰 {reviewCount}</h3>
          {isLoading ? (
            <p role="status" className="py-8 text-center text-sm text-slate-500">리뷰를 불러오는 중입니다.</p>
          ) : reviews.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">아직 등록된 리뷰가 없습니다.</p>
          ) : (
            <div className="mt-3 divide-y divide-slate-200">
              {reviews.map((review) => {
                const isOwnReview = Boolean(user && review.user?.id === user.id);
                const isBlinded = review.status === "BLINDED";
                const isDeleted = review.status === "DELETED";
                const commentCount = countComments(review.comments ?? []);
                const areCommentsExpanded = !collapsedCommentReviewIds.has(review.id);
                const commentsRegionId = `gym-review-comments-${review.id}`;

                return (
                  <article key={review.id} className="py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">{authorName(review.user)}</span>
                          <span>{formatDate(review.createdAt)}</span>
                          {isOwnReview && <span className="font-semibold text-emerald-700">내 리뷰</span>}
                        </div>
                        {!isBlinded && !isDeleted && <div className="mt-1"><RatingStars rating={review.rating} /></div>}
                      </div>
                      {!isOwnReview && !isBlinded && !isDeleted && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!requireLogin()) return;
                            setReportReview(review);
                            setReportReason("");
                            setReportErrorMessage(null);
                          }}
                          className="text-xs font-semibold text-slate-500 hover:text-red-700"
                        >
                          신고
                        </button>
                      )}
                    </div>
                    <p className={`mt-3 whitespace-pre-wrap text-sm leading-6 ${isBlinded || isDeleted ? "text-slate-400" : "text-slate-700"}`}>
                      {isDeleted ? "삭제된 리뷰입니다." : isBlinded ? "관리자에 의해 가려진 리뷰입니다." : review.content}
                    </p>

                    {!isBlinded && !isDeleted && (
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                          <span>댓글 {commentCount}</span>
                          {commentCount > 0 && (
                            <button
                              type="button"
                              aria-controls={commentsRegionId}
                              aria-expanded={areCommentsExpanded}
                              onClick={() => toggleReviewComments(review.id)}
                              className="font-semibold text-slate-600 hover:text-emerald-700"
                            >
                              {areCommentsExpanded ? "댓글 숨기기" : "댓글 보기"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (!requireLogin()) return;
                              showReviewComments(review.id);
                              setOpenCommentReviewId((current) => current === review.id ? null : review.id);
                            }}
                            className="hover:text-emerald-700"
                          >
                            댓글 쓰기
                          </button>
                        </div>

                        <div id={commentsRegionId} hidden={!areCommentsExpanded}>
                          {openCommentReviewId === review.id && (
                            <div className="mt-3">
                              <CommentForm
                                value={commentDrafts[review.id] ?? ""}
                                placeholder="리뷰에 대한 댓글을 입력해 주세요."
                                submitLabel="댓글 등록"
                                isSubmitting={isCommentSubmitting}
                                onChange={(value) => setCommentDrafts((current) => ({ ...current, [review.id]: value }))}
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  void submitComment(review.id, commentDrafts[review.id] ?? "");
                                }}
                                onCancel={() => setOpenCommentReviewId(null)}
                              />
                            </div>
                          )}

                          {(review.comments ?? []).length > 0 && (
                            <div className="mt-3 space-y-2">
                              {(review.comments ?? []).map((comment) => (
                                <GymReviewCommentItem
                                  key={comment.id}
                                  reviewId={review.id}
                                  comment={comment}
                                  depth={0}
                                  currentUserId={user?.id}
                                  replyDrafts={replyDrafts}
                                  isSubmitting={isCommentSubmitting}
                                  onOpenReply={(commentId) => {
                                    if (!requireLogin()) return;
                                    showReviewComments(review.id);
                                    setReplyDrafts((current) => ({ ...current, [commentId]: current[commentId] ?? "" }));
                                  }}
                                  onChangeReply={(commentId, value) => setReplyDrafts((current) => ({ ...current, [commentId]: value }))}
                                  onCloseReply={(commentId) => setReplyDrafts((current) => {
                                    const next = { ...current };
                                    delete next[commentId];
                                    return next;
                                  })}
                                  onSubmitReply={(reviewId, commentId, event) => {
                                    event.preventDefault();
                                    void submitComment(reviewId, replyDrafts[commentId] ?? "", commentId);
                                  }}
                                  onDelete={setDeleteCommentTarget}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {deleteCommentTarget && (
        <Modal onClose={() => setDeleteCommentTarget(null)} ariaLabelledBy="gym-comment-delete-title">
          <h2 id="gym-comment-delete-title" className="pr-8 text-lg font-bold text-slate-950">댓글 삭제</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">댓글을 삭제하시겠습니까? 답글이 있으면 삭제된 댓글로 표시됩니다.</p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteCommentTarget(null)} disabled={isDialogSubmitting} className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">
              취소
            </button>
            <button type="button" onClick={() => void submitDeleteComment()} disabled={isDialogSubmitting} className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-slate-300">
              {isDialogSubmitting ? "처리 중" : "삭제하기"}
            </button>
          </div>
        </Modal>
      )}

      {reportReview && (
        <Modal
          onClose={() => {
            setReportReview(null);
            setReportReason("");
            setReportErrorMessage(null);
          }}
          ariaLabelledBy="gym-review-report-title"
        >
          <h2 id="gym-review-report-title" className="pr-8 text-lg font-bold text-slate-950">리뷰 신고</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">운영자가 확인할 수 있도록 신고 사유를 입력해 주세요.</p>
          <textarea
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            rows={4}
            maxLength={500}
            className="mt-4 min-h-28 w-full resize-y rounded border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-emerald-500"
            placeholder="신고 사유를 입력해 주세요."
          />
          {reportErrorMessage && (
            <p role="alert" className="mt-3 text-sm font-medium text-red-700">
              {reportErrorMessage}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setReportReview(null);
                setReportReason("");
                setReportErrorMessage(null);
              }}
              disabled={isDialogSubmitting}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              취소
            </button>
            <button type="button" onClick={() => void submitReport()} disabled={isDialogSubmitting || !reportReason.trim()} className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-300">
              {isDialogSubmitting ? "처리 중" : "신고하기"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
