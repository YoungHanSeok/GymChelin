"use client";

import { isAxiosError } from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import { authorName, formatDateLabel, type ApiComment, type ApiPost, type PostCategory } from "@/lib/community-types";

const categoryLabel = {
  FREE: "자유게시판",
  WORKOUT_LOG: "운동일지",
} as const;

type PostDetailProps = {
  category: PostCategory;
  backHref: string;
  backLabel: string;
};

type CommentFormProps = {
  value: string;
  placeholder: string;
  isSubmitting: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

type CommunityDialogProps = {
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

type CommentItemProps = {
  comment: ApiComment;
  depth: number;
  hiddenReplies: Set<number>;
  menuCommentId: number | null;
  replyDrafts: Record<number, string>;
  isSubmitting: boolean;
  currentUserId?: number;
  isAdmin: boolean;
  onToggleReplies: (commentId: number) => void;
  onToggleMenu: (commentId: number) => void;
  onShowReplyForm: (commentId: number) => void;
  onChangeReply: (commentId: number, value: string) => void;
  onSubmitReply: (commentId: number, event: FormEvent<HTMLFormElement>) => void;
  onReact: (commentId: number, type: "LIKE" | "DISLIKE") => void;
  onReport: (commentId: number) => void;
  onDelete: (commentId: number) => void;
};

function ThumbIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${direction === "down" ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
      <path d="M7 11l4-8a3 3 0 0 1 3 3v4h5a2 2 0 0 1 2 2l-1 7a2 2 0 0 1-2 2H7V11Z" />
    </svg>
  );
}

function countComments(comments: ApiComment[] = []): number {
  return comments.reduce((sum, comment) => sum + 1 + countComments(comment.replies ?? []), 0);
}

function CommentForm({ value, placeholder, isSubmitting, onChange, onSubmit }: CommentFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="min-h-24 w-full resize-y rounded border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-emerald-500"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !value.trim()}
          className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          등록
        </button>
      </div>
    </form>
  );
}

function CommunityDialog({
  title,
  description,
  submitLabel,
  submitTone = "default",
  isSubmitting,
  isSubmitDisabled,
  children,
  onClose,
  onSubmit,
}: CommunityDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-dialog-title"
        className="w-full max-w-sm rounded border border-slate-200 bg-white p-5 shadow-xl"
      >
        <h2 id="community-dialog-title" className="text-base font-semibold text-slate-950">
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

function CommentItem({
  comment,
  depth,
  hiddenReplies,
  menuCommentId,
  replyDrafts,
  isSubmitting,
  currentUserId,
  isAdmin,
  onToggleReplies,
  onToggleMenu,
  onShowReplyForm,
  onChangeReply,
  onSubmitReply,
  onReact,
  onReport,
  onDelete,
}: CommentItemProps) {
  const replies = comment.replies ?? [];
  const hasReplies = replies.length > 0;
  const isRepliesHidden = hiddenReplies.has(comment.id);
  const isReplyFormOpen = Object.prototype.hasOwnProperty.call(replyDrafts, comment.id);
  const isDeleted = Boolean(comment.isDeleted || comment.status === "DELETED");
  const canDelete = isAdmin || comment.author?.id === currentUserId;

  return (
    <div className={`${depth > 0 ? "border-l border-slate-200 pl-4" : ""}`}>
      <div className="py-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{authorName(comment.author)}</span>
          <span>{formatDateLabel(comment.createdAt)}</span>
        </div>
        <p className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${isDeleted ? "text-slate-400" : "text-slate-700"}`}>
          {isDeleted ? "삭제된 댓글입니다." : comment.content}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          {!isDeleted && (
            <>
              <button
                type="button"
                onClick={() => onReact(comment.id, "LIKE")}
                className="inline-flex items-center gap-1 hover:text-emerald-700"
              >
                <ThumbIcon direction="up" />
                <span>{comment.likeCount ?? 0}</span>
              </button>
              <button
                type="button"
                onClick={() => onReact(comment.id, "DISLIKE")}
                className="inline-flex items-center gap-1 hover:text-red-700"
              >
                <ThumbIcon direction="down" />
                <span>{comment.dislikeCount ?? 0}</span>
              </button>
            </>
          )}
          {hasReplies && (
            <button type="button" onClick={() => onToggleReplies(comment.id)} className="hover:text-slate-950">
              {isRepliesHidden ? `댓글 보기 ${replies.length}` : "댓글 숨기기"}
            </button>
          )}
          {!isDeleted && (
            <button type="button" onClick={() => onShowReplyForm(comment.id)} className="hover:text-slate-950">
              댓글쓰기
            </button>
          )}
          {!isDeleted && (
            <div className="relative">
              <button
                type="button"
                onClick={() => onToggleMenu(comment.id)}
                className="rounded px-2 text-lg leading-none hover:bg-slate-100 hover:text-slate-950"
                aria-label="댓글 메뉴 열기"
              >
                ...
              </button>
              {menuCommentId === comment.id && (
                <div className="absolute left-0 top-7 z-20 w-28 rounded border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => onReport(comment.id)}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                  >
                    신고하기
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(comment.id)}
                      className="block w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                    >
                      삭제하기
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {isReplyFormOpen && !isDeleted && (
          <div className="mt-3">
            <CommentForm
              value={replyDrafts[comment.id] ?? ""}
              placeholder="대댓글을 입력해 주세요."
              isSubmitting={isSubmitting}
              onChange={(value) => onChangeReply(comment.id, value)}
              onSubmit={(event) => onSubmitReply(comment.id, event)}
            />
          </div>
        )}
      </div>

      {hasReplies && !isRepliesHidden && (
        <div className="space-y-1">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              hiddenReplies={hiddenReplies}
              menuCommentId={menuCommentId}
              replyDrafts={replyDrafts}
              isSubmitting={isSubmitting}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onToggleReplies={onToggleReplies}
              onToggleMenu={onToggleMenu}
              onShowReplyForm={onShowReplyForm}
              onChangeReply={onChangeReply}
              onSubmitReply={onSubmitReply}
              onReact={onReact}
              onReport={onReport}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostDetail({ category, backHref, backLabel }: PostDetailProps) {
  const params = useParams<{ id: string }>();
  const postId = useMemo(() => Number(params.id), [params.id]);
  const { user } = useAuthSession();
  const [post, setPost] = useState<ApiPost | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [hiddenReplies, setHiddenReplies] = useState<Set<number>>(new Set());
  const [menuCommentId, setMenuCommentId] = useState<number | null>(null);
  const [deleteCommentId, setDeleteCommentId] = useState<number | null>(null);
  const [reportCommentId, setReportCommentId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogSubmitting, setIsDialogSubmitting] = useState(false);

  const loadPost = useCallback(async () => {
    if (!Number.isInteger(postId) || postId < 1) {
      setPost(null);
      setErrorMessage("올바르지 않은 게시글 주소입니다.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.get<ApiPost>(`/posts/${postId}`);

      setPost(response.data.category === category ? response.data : null);
      setErrorMessage(null);
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      setPost(null);

      if (status === 400) {
        setErrorMessage("올바르지 않은 게시글 주소입니다.");
      } else if (status === 404) {
        setErrorMessage(null);
      } else {
        setErrorMessage("게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [category, postId]);

  useEffect(() => {
    void loadPost();
  }, [loadPost]);

  const requireLogin = () => {
    if (user) {
      return true;
    }

    setNoticeMessage("로그인 후 사용할 수 있습니다.");
    return false;
  };

  const submitComment = async (parentId: number | null, content: string) => {
    if (!requireLogin()) {
      return;
    }

    const nextContent = content.trim();
    if (!nextContent) {
      return;
    }

    setIsSubmitting(true);
    setNoticeMessage(null);

    try {
      await api.post(`/posts/${postId}/comments`, {
        content: nextContent,
        parentId,
      });
      setCommentDraft("");
      if (parentId) {
        setReplyDrafts((drafts) => {
          const nextDrafts = { ...drafts };
          delete nextDrafts[parentId];
          return nextDrafts;
        });
      }
      await loadPost();
    } catch {
      setNoticeMessage("댓글을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitComment(null, commentDraft);
  };

  const handleSubmitReply = (commentId: number, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitComment(commentId, replyDrafts[commentId] ?? "");
  };

  const handleReact = async (commentId: number, type: "LIKE" | "DISLIKE") => {
    if (!requireLogin()) {
      return;
    }

    try {
      await api.post(`/posts/${postId}/comments/${commentId}/reactions`, { type });
      await loadPost();
    } catch {
      setNoticeMessage("댓글 반응을 처리하지 못했습니다.");
    }
  };

  const handleReport = (commentId: number) => {
    if (!requireLogin()) {
      return;
    }

    setMenuCommentId(null);
    setReportCommentId(commentId);
    setReportReason("");
  };

  const submitReport = async () => {
    if (!reportCommentId || !reportReason.trim()) {
      return;
    }

    setIsDialogSubmitting(true);

    try {
      await api.post("/reports", {
        targetType: "COMMENT",
        targetId: reportCommentId,
        reason: reportReason.trim(),
      });
      setReportCommentId(null);
      setReportReason("");
      setNoticeMessage("신고가 접수되었습니다.");
    } catch {
      setNoticeMessage("신고를 접수하지 못했습니다.");
    } finally {
      setIsDialogSubmitting(false);
    }
  };

  const handleDelete = (commentId: number) => {
    if (!requireLogin()) {
      return;
    }

    setMenuCommentId(null);
    setDeleteCommentId(commentId);
  };

  const submitDelete = async () => {
    if (!deleteCommentId) {
      return;
    }

    setIsDialogSubmitting(true);

    try {
      await api.delete(`/posts/${postId}/comments/${deleteCommentId}`);
      setDeleteCommentId(null);
      await loadPost();
    } catch {
      setNoticeMessage("댓글을 삭제하지 못했습니다.");
    } finally {
      setIsDialogSubmitting(false);
    }
  };

  const handleToggleReplies = (commentId: number) => {
    setHiddenReplies((current) => {
      const next = new Set(current);

      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }

      return next;
    });
  };

  const handleShowReplyForm = (commentId: number) => {
    if (!requireLogin()) {
      return;
    }

    setReplyDrafts((drafts) => ({
      ...drafts,
      [commentId]: drafts[commentId] ?? "",
    }));
  };

  if (isLoading) {
    return <p className="border-b border-slate-200 py-8 text-sm text-slate-500">게시글을 불러오는 중입니다.</p>;
  }

  if (!post) {
    return (
      <section className="border-b border-slate-200 py-8">
        <Link href={backHref} className="text-sm font-medium text-emerald-700 hover:text-emerald-900">
          {backLabel}
        </Link>
        <p className={`mt-5 text-sm ${errorMessage ? "text-red-700" : "text-slate-500"}`}>
          {errorMessage ?? "게시글을 찾을 수 없습니다."}
        </p>
      </section>
    );
  }

  const comments = post.comments ?? [];
  const commentCount = countComments(comments);

  return (
    <>
      <article className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <Link href={backHref} className="text-sm font-medium text-emerald-700 hover:text-emerald-900">
          {backLabel}
        </Link>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span className="font-semibold text-emerald-700">{categoryLabel[post.category]}</span>
          <span>{authorName(post.author)}</span>
          <span>{formatDateLabel(post.createdAt)}</span>
        </div>
        <h1 className="mt-3 text-2xl font-black leading-8 text-slate-950">{post.title}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
          <span>조회 {post.viewCount}</span>
          <span>댓글 {commentCount}</span>
          <span>추천 {post._count?.reactions ?? 0}</span>
        </div>
      </header>

      <div className="whitespace-pre-wrap border-b border-slate-200 pb-6 text-base leading-7 text-slate-700">
        {post.content}
      </div>

      <section className="border-b border-slate-200 pb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-950">댓글 {commentCount}</h2>
        </div>

        <div className="mt-4">
          <CommentForm
            value={commentDraft}
            placeholder={user ? "댓글을 입력해 주세요." : "로그인 후 댓글을 작성할 수 있습니다."}
            isSubmitting={isSubmitting}
            onChange={setCommentDraft}
            onSubmit={handleSubmitComment}
          />
        </div>

        {noticeMessage && <p className="mt-3 text-sm text-emerald-700">{noticeMessage}</p>}

        {comments.length > 0 ? (
          <div className="mt-5 divide-y divide-slate-100">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                depth={0}
                hiddenReplies={hiddenReplies}
                menuCommentId={menuCommentId}
                replyDrafts={replyDrafts}
                isSubmitting={isSubmitting}
                currentUserId={user?.id}
                isAdmin={user?.role === "ADMIN"}
                onToggleReplies={handleToggleReplies}
                onToggleMenu={(commentId) => setMenuCommentId((current) => (current === commentId ? null : commentId))}
                onShowReplyForm={handleShowReplyForm}
                onChangeReply={(commentId, value) =>
                  setReplyDrafts((drafts) => ({
                    ...drafts,
                    [commentId]: value,
                  }))
                }
                onSubmitReply={handleSubmitReply}
                onReact={(commentId, type) => void handleReact(commentId, type)}
                onReport={(commentId) => void handleReport(commentId)}
                onDelete={(commentId) => void handleDelete(commentId)}
              />
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-slate-500">아직 댓글이 없습니다.</p>
        )}
      </section>
      </article>

      {deleteCommentId && (
        <CommunityDialog
          title="댓글 삭제"
          description="댓글을 삭제하시겠습니까? 삭제 후에는 댓글 내용이 삭제된 댓글입니다로 표시됩니다."
          submitLabel="삭제하기"
          submitTone="danger"
          isSubmitting={isDialogSubmitting}
          onClose={() => setDeleteCommentId(null)}
          onSubmit={() => void submitDelete()}
        />
      )}

      {reportCommentId && (
        <CommunityDialog
          title="댓글 신고"
          description="신고 사유를 입력해 주세요."
          submitLabel="신고하기"
          isSubmitting={isDialogSubmitting}
          isSubmitDisabled={!reportReason.trim()}
          onClose={() => {
            setReportCommentId(null);
            setReportReason("");
          }}
          onSubmit={() => void submitReport()}
        >
          <textarea
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            rows={4}
            className="min-h-28 w-full resize-y rounded border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-emerald-500"
            placeholder="신고 사유를 입력해 주세요."
          />
        </CommunityDialog>
      )}
    </>
  );
}
