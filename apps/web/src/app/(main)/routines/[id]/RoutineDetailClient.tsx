"use client";

// 루틴 상세 조회, 좋아요, 수행 일지 작성 상호작용을 처리한다.
import { isAxiosError } from "axios";
import Link from "next/link";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import AdSlot from "@/components/ads/AdSlot";
import MarkdownViewer from "@/components/community/MarkdownViewer";
import api from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import { authorName, formatDateLabel } from "@/lib/community-types";
import {
  type ApiRoutine,
  type ApiRoutineComment,
  type RoutineLikeResponse,
  routineDayLabel,
} from "@/lib/routine-types";

type ReportTarget = {
  type: "ROUTINE" | "ROUTINE_COMMENT";
  id: number;
};

type RoutineDialogProps = {
  title: string;
  description?: string;
  submitLabel: string;
  submitTone?: "default" | "danger";
  isSubmitting: boolean;
  isSubmitDisabled?: boolean;
  children?: ReactNode;
  onClose: () => void;
  onSubmit: () => void;
};

function RoutineDialog({
  title,
  description,
  submitLabel,
  submitTone = "default",
  isSubmitting,
  isSubmitDisabled,
  children,
  onClose,
  onSubmit,
}: RoutineDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="routine-dialog-title"
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <h2 id="routine-dialog-title" className="text-base font-semibold text-slate-950">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>}
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || isSubmitDisabled}
            className={`rounded px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 ${
              submitTone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-slate-950 hover:bg-emerald-700"
            }`}
          >
            {isSubmitting ? "처리 중" : submitLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function CommentForm({
  value,
  placeholder,
  isSubmitting,
  submitLabel = "등록",
  onChange,
  onSubmit,
  onCancel,
}: {
  value: string;
  placeholder: string;
  isSubmitting: boolean;
  submitLabel?: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={2000}
        className="min-h-24 w-full resize-y rounded border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-emerald-500"
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 disabled:opacity-60"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !value.trim()}
          className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? "등록 중" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function countComments(comments: ApiRoutineComment[]): number {
  return comments.reduce((count, comment) => count + 1 + countComments(comment.replies ?? []), 0);
}

function addReply(
  comments: ApiRoutineComment[],
  parentId: number,
  reply: ApiRoutineComment,
): ApiRoutineComment[] {
  return comments.map((comment) => {
    if (comment.id === parentId) {
      return {
        ...comment,
        replies: [...(comment.replies ?? []), reply],
      };
    }

    return {
      ...comment,
      replies: addReply(comment.replies ?? [], parentId, reply),
    };
  });
}

function markCommentDeleted(comments: ApiRoutineComment[], commentId: number): ApiRoutineComment[] {
  return comments.map((comment) =>
    comment.id === commentId
      ? {
          ...comment,
          content: "",
          status: "DELETED",
          isDeleted: true,
        }
      : {
          ...comment,
          replies: markCommentDeleted(comment.replies ?? [], commentId),
        },
  );
}

function RoutineCommentItem({
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
  onReport,
}: {
  comment: ApiRoutineComment;
  depth: number;
  currentUserId?: number;
  replyDrafts: Record<number, string>;
  isSubmitting: boolean;
  onOpenReply: (commentId: number) => void;
  onChangeReply: (commentId: number, value: string) => void;
  onCloseReply: (commentId: number) => void;
  onSubmitReply: (commentId: number, event: FormEvent<HTMLFormElement>) => void;
  onDelete: (commentId: number) => void;
  onReport: (commentId: number) => void;
}) {
  const isDeleted = Boolean(comment.isDeleted || comment.status === "DELETED");
  const isBlinded = comment.status === "BLINDED";
  const isOwnComment = Boolean(currentUserId && comment.author?.id === currentUserId);
  const isReplyOpen = Object.prototype.hasOwnProperty.call(replyDrafts, comment.id);

  return (
    <div className={depth > 0 ? "ml-4 border-l border-slate-200 pl-4 sm:ml-8" : ""}>
      <article className="py-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{authorName(comment.author)}</span>
          <span>{formatDateLabel(comment.createdAt)}</span>
        </div>
        <p className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${isDeleted || isBlinded ? "text-slate-400" : "text-slate-700"}`}>
          {isDeleted ? "삭제된 댓글입니다." : isBlinded ? "관리자에 의해 가려진 댓글입니다." : comment.content}
        </p>

        {!isDeleted && !isBlinded && (
          <div className="mt-3 flex items-center gap-3 text-xs font-medium text-slate-500">
            <button type="button" onClick={() => onOpenReply(comment.id)} className="hover:text-emerald-700">
              답글
            </button>
            {isOwnComment ? (
              <button type="button" onClick={() => onDelete(comment.id)} className="hover:text-red-700">
                삭제
              </button>
            ) : (
              <button type="button" onClick={() => onReport(comment.id)} className="hover:text-red-700">
                신고
              </button>
            )}
          </div>
        )}

        {isReplyOpen && !isDeleted && !isBlinded && (
          <div className="mt-4">
            <CommentForm
              value={replyDrafts[comment.id] ?? ""}
              placeholder="답글을 입력해 주세요."
              submitLabel="답글 등록"
              isSubmitting={isSubmitting}
              onChange={(value) => onChangeReply(comment.id, value)}
              onSubmit={(event) => onSubmitReply(comment.id, event)}
              onCancel={() => onCloseReply(comment.id)}
            />
          </div>
        )}
      </article>

      {(comment.replies ?? []).map((reply) => (
        <RoutineCommentItem
          key={reply.id}
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
          onReport={onReport}
        />
      ))}
    </div>
  );
}

export default function RoutineDetailClient({ initialRoutine }: { initialRoutine: ApiRoutine }) {
  const { user } = useAuthSession();
  const routine = initialRoutine;
  const [comments, setComments] = useState(initialRoutine.comments ?? []);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [liked, setLiked] = useState(initialRoutine.liked ?? false);
  const [likeCount, setLikeCount] = useState(initialRoutine.likeCount ?? initialRoutine._count?.likes ?? 0);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [deleteCommentId, setDeleteCommentId] = useState<number | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogSubmitting, setIsDialogSubmitting] = useState(false);

  const sortedDays = useMemo(
    () => [...(routine.days ?? [])].sort((first, second) => first.sortOrder - second.sortOrder),
    [routine.days],
  );
  const commentCount = countComments(comments);
  const isOwnRoutine = Boolean(user && routine.author?.id === user.id);

  const requireLogin = () => {
    if (user) {
      return true;
    }

    setErrorMessage(null);
    setNoticeMessage("로그인 후 사용할 수 있습니다.");
    return false;
  };

  const copyPublicCode = async () => {
    try {
      await navigator.clipboard.writeText(routine.publicCode);
      setErrorMessage(null);
      setNoticeMessage("루틴 고유코드가 복사되었습니다.");
    } catch {
      setNoticeMessage(null);
      setErrorMessage("고유코드를 복사하지 못했습니다. 직접 선택해 복사해 주세요.");
    }
  };

  const toggleLike = async () => {
    if (!requireLogin() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const response = await api.post<RoutineLikeResponse>(`/routines/${routine.id}/like`);
      setLiked(response.data.liked);
      setLikeCount(response.data.likeCount);
    } catch {
      setErrorMessage("좋아요를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitComment = async (content: string, parentId?: number) => {
    if (!requireLogin()) {
      return;
    }

    const nextContent = content.trim();
    if (!nextContent) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const response = await api.post<ApiRoutineComment>(`/routines/${routine.id}/comments`, {
        content: nextContent,
        ...(parentId ? { parentId } : {}),
      });

      if (parentId) {
        setComments((current) => addReply(current, parentId, response.data));
        setReplyDrafts((current) => {
          const next = { ...current };
          delete next[parentId];
          return next;
        });
      } else {
        setComments((current) => [...current, response.data]);
        setCommentDraft("");
      }
      setNoticeMessage("댓글이 등록되었습니다.");
    } catch (error) {
      setErrorMessage(
        isAxiosError(error) && error.response?.status === 401
          ? "로그인 후 댓글을 작성할 수 있습니다."
          : "댓글을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitDeleteComment = async () => {
    if (!deleteCommentId) {
      return;
    }

    setIsDialogSubmitting(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      await api.delete(`/routines/${routine.id}/comments/${deleteCommentId}`);
      setComments((current) => markCommentDeleted(current, deleteCommentId));
      setDeleteCommentId(null);
      setNoticeMessage("댓글이 삭제되었습니다.");
    } catch (error) {
      setErrorMessage(
        isAxiosError(error) && error.response?.status === 403
          ? "본인이 작성한 댓글만 삭제할 수 있습니다."
          : "댓글을 삭제하지 못했습니다.",
      );
    } finally {
      setIsDialogSubmitting(false);
    }
  };

  const openReport = (target: ReportTarget) => {
    if (!requireLogin()) {
      return;
    }

    setReportTarget(target);
    setReportReason("");
  };

  const submitReport = async () => {
    if (!reportTarget || !reportReason.trim()) {
      return;
    }

    setIsDialogSubmitting(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      await api.post("/reports", {
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        reason: reportReason.trim(),
      });
      setReportTarget(null);
      setReportReason("");
      setNoticeMessage("신고가 접수되었습니다.");
    } catch {
      setErrorMessage("신고를 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsDialogSubmitting(false);
    }
  };

  return (
    <>
      <article className="space-y-7">
        <header className="border-b border-slate-200 pb-6">
          <Link href="/routines" className="text-sm font-medium text-emerald-700 hover:text-emerald-900">
            나의 루틴으로 돌아가기
          </Link>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="font-semibold text-emerald-700">나의 루틴</span>
              <span>{authorName(routine.author)}</span>
              <span>{formatDateLabel(routine.createdAt)}</span>
            </div>
            <button
              type="button"
              onClick={() => void copyPublicCode()}
              className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 font-mono text-xs font-semibold text-slate-700 hover:border-emerald-500 hover:text-emerald-700"
            >
              {routine.publicCode} · 복사
            </button>
          </div>

          <h1 className="mt-4 text-2xl font-black leading-8 text-slate-950">{routine.title}</h1>

          {(routine.tags ?? []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(routine.tags ?? []).map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span>조회 {routine.viewCount ?? 0}</span>
            <span>댓글 {commentCount}</span>
            <span>추천 {likeCount}</span>
            {!isOwnRoutine && (
              <button
                type="button"
                onClick={() => openReport({ type: "ROUTINE", id: routine.id })}
                className="font-medium hover:text-red-700"
              >
                신고
              </button>
            )}
          </div>
        </header>

        {(routine.content || routine.summary) && (
          <section className="border-b border-slate-200 pb-7" aria-labelledby="routine-introduction-title">
            <h2 id="routine-introduction-title" className="mb-3 text-lg font-bold text-slate-950">
              루틴 소개
            </h2>
            <div className="text-base leading-7 text-slate-700">
              <MarkdownViewer content={routine.content || routine.summary || ""} />
            </div>
          </section>
        )}

        <section aria-labelledby="routine-schedule-title">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="routine-schedule-title" className="text-lg font-bold text-slate-950">
                요일별 운동 루틴
              </h2>
              <p className="mt-1 text-sm text-slate-500">무게는 kg, 운동 시간은 분 단위입니다.</p>
            </div>
            <span className="text-sm text-slate-500">운동 요일 {sortedDays.length}일</span>
          </div>

          <div className="mt-5 space-y-5">
            {sortedDays.map((day) => {
              const exercises = [...(day.exercises ?? [])].sort(
                (first, second) => first.sortOrder - second.sortOrder,
              );

              return (
                <section key={day.dayOfWeek} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <header className="flex items-center justify-between bg-emerald-50 px-4 py-3 sm:px-5">
                    <h3 className="font-bold text-emerald-950">{routineDayLabel[day.dayOfWeek]}요일</h3>
                    <span className="text-xs font-medium text-emerald-800">운동 {exercises.length}개</span>
                  </header>

                  <div className="divide-y divide-slate-200">
                    {exercises.map((exercise) => {
                      const sets = [...(exercise.sets ?? [])].sort(
                        (first, second) => first.sortOrder - second.sortOrder,
                      );

                      return (
                        <article key={exercise.id} className="p-4 sm:p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-semibold text-slate-950">{exercise.exerciseName}</h4>
                                {exercise.durationMinutes && (
                                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                                    총 {exercise.durationMinutes}분
                                  </span>
                                )}
                              </div>
                              {exercise.exerciseReason && (
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                  <span className="font-semibold text-slate-700">운동 이유:</span>{" "}
                                  {exercise.exerciseReason}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 text-xs text-slate-500">
                              {exercise.bodyParts.map((bodyPart) => (
                                <span key={bodyPart} className="rounded-full bg-slate-100 px-2 py-1">
                                  {bodyPart}
                                </span>
                              ))}
                              {exercise.equipment && (
                                <span className="rounded-full bg-slate-100 px-2 py-1">{exercise.equipment}</span>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 overflow-x-auto">
                            <table className="w-full min-w-80 table-fixed text-left text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 text-xs text-slate-500">
                                  <th scope="col" className="w-1/3 px-3 py-2 font-medium">세트</th>
                                  <th scope="col" className="w-1/3 px-3 py-2 font-medium">무게(kg)</th>
                                  <th scope="col" className="w-1/3 px-3 py-2 font-medium">반복횟수</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700">
                                {sets.map((set, index) => (
                                  <tr key={set.id}>
                                    <th scope="row" className="px-3 py-2.5 font-semibold text-slate-700">
                                      {index + 1}세트
                                    </th>
                                    <td className="px-3 py-2.5">{set.weightKg}</td>
                                    <td className="px-3 py-2.5">{set.repetitions ?? "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </section>

        <section className="border-y border-slate-200 py-6" aria-label="루틴 추천">
          <div className="flex justify-center">
            <button
              type="button"
              aria-pressed={liked}
              onClick={() => void toggleLike()}
              disabled={isSubmitting}
              className={`rounded-full border px-6 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                liked
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-emerald-600 hover:text-emerald-700"
              }`}
            >
              {liked ? "좋아요 취소" : "좋아요"} {likeCount}
            </button>
          </div>
        </section>

        <AdSlot slot="POST_LIST_INLINE" label="루틴 상세 광고" />

        <section className="pb-7" aria-labelledby="routine-comments-title">
          <h2 id="routine-comments-title" className="text-lg font-bold text-slate-950">
            댓글 {commentCount}
          </h2>

          <div className="mt-4">
            <CommentForm
              value={commentDraft}
              placeholder={user ? "댓글을 입력해 주세요." : "로그인 후 댓글을 작성할 수 있습니다."}
              isSubmitting={isSubmitting}
              onChange={setCommentDraft}
              onSubmit={(event) => {
                event.preventDefault();
                void submitComment(commentDraft);
              }}
            />
          </div>

          {comments.length > 0 ? (
            <div className="mt-5 divide-y divide-slate-100">
              {comments.map((comment) => (
                <RoutineCommentItem
                  key={comment.id}
                  comment={comment}
                  depth={0}
                  currentUserId={user?.id}
                  replyDrafts={replyDrafts}
                  isSubmitting={isSubmitting}
                  onOpenReply={(commentId) => {
                    if (!requireLogin()) {
                      return;
                    }
                    setReplyDrafts((current) => ({ ...current, [commentId]: current[commentId] ?? "" }));
                  }}
                  onChangeReply={(commentId, value) =>
                    setReplyDrafts((current) => ({ ...current, [commentId]: value }))
                  }
                  onCloseReply={(commentId) =>
                    setReplyDrafts((current) => {
                      const next = { ...current };
                      delete next[commentId];
                      return next;
                    })
                  }
                  onSubmitReply={(commentId, event) => {
                    event.preventDefault();
                    void submitComment(replyDrafts[commentId] ?? "", commentId);
                  }}
                  onDelete={setDeleteCommentId}
                  onReport={(commentId) => openReport({ type: "ROUTINE_COMMENT", id: commentId })}
                />
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500">아직 댓글이 없습니다.</p>
          )}
        </section>
      </article>

      {noticeMessage && (
        <div
          role="status"
          className="fixed right-4 top-20 z-40 max-w-sm rounded border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg"
        >
          {noticeMessage}
        </div>
      )}
      {errorMessage && (
        <div
          role="alert"
          className="fixed right-4 top-20 z-40 max-w-sm rounded border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 shadow-lg"
        >
          {errorMessage}
        </div>
      )}

      {deleteCommentId && (
        <RoutineDialog
          title="댓글 삭제"
          description="댓글을 삭제하시겠습니까? 답글이 있는 경우 삭제된 댓글로 표시됩니다."
          submitLabel="삭제하기"
          submitTone="danger"
          isSubmitting={isDialogSubmitting}
          onClose={() => setDeleteCommentId(null)}
          onSubmit={() => void submitDeleteComment()}
        />
      )}

      {reportTarget && (
        <RoutineDialog
          title={reportTarget.type === "ROUTINE" ? "루틴 신고" : "댓글 신고"}
          description="운영자가 확인할 수 있도록 신고 사유를 입력해 주세요."
          submitLabel="신고하기"
          isSubmitting={isDialogSubmitting}
          isSubmitDisabled={!reportReason.trim()}
          onClose={() => {
            setReportTarget(null);
            setReportReason("");
          }}
          onSubmit={() => void submitReport()}
        >
          <textarea
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            rows={4}
            maxLength={500}
            className="min-h-28 w-full resize-y rounded border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-emerald-500"
            placeholder="신고 사유를 입력해 주세요."
          />
        </RoutineDialog>
      )}
    </>
  );
}
