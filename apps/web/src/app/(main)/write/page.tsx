"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MarkdownEditor, { type MarkdownEditorHandle } from "@/components/community/MarkdownEditor";
import api from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";

type WriteCategory = "WORKOUT_LOG" | "FREE" | "ROUTINE";

const categoryOptions: { value: WriteCategory; label: string; redirectPath: string }[] = [
  { value: "WORKOUT_LOG", label: "운동일지", redirectPath: "/boards/workout-log" },
  { value: "FREE", label: "자유게시판", redirectPath: "/boards/free" },
  { value: "ROUTINE", label: "나의 루틴", redirectPath: "/routines" },
];

const isWriteCategory = (value: string | null): value is WriteCategory =>
  value === "WORKOUT_LOG" || value === "FREE" || value === "ROUTINE";

const parseTags = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter(Boolean);

const validateTags = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { tags: [] as string[], error: null };
  }

  const tagValues = trimmedValue.split(",").map((tag) => tag.trim());
  const isValid = tagValues.every((tag) => /^#[가-힣A-Za-z0-9_]{1,20}$/.test(tag));

  if (!isValid) {
    return {
      tags: [] as string[],
      error: "태그는 #운동, #데드리프트처럼 콤마로 구분하고 한글, 영문, 숫자, 언더스코어만 사용할 수 있습니다.",
    };
  }

  return { tags: parseTags(value), error: null };
};

const getPlainSummary = (content: string) =>
  content
    .replace(/[#*_`>[\]()~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

export default function WritePage() {
  const router = useRouter();
  const { user, isLoading } = useAuthSession();
  const editorRef = useRef<MarkdownEditorHandle | null>(null);
  const redirectTimerRef = useRef<number | null>(null);
  const [category, setCategory] = useState<WriteCategory>("WORKOUT_LOG");
  const [title, setTitle] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCategory = useMemo(
    () => categoryOptions.find((option) => option.value === category) ?? categoryOptions[0],
    [category],
  );
  const canWrite = !isLoading && Boolean(user);
  const authStatusMessage = isLoading
    ? "로그인 상태를 확인하는 중입니다."
    : notice ?? "로그인이 필요합니다. 로그인 페이지로 이동합니다.";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get("category");

    if (isWriteCategory(categoryParam)) {
      setCategory(categoryParam);
    }
  }, []);

  useEffect(() => {
    if (isLoading || user) {
      if (user) {
        setNotice(null);
      }

      return;
    }

    setNotice("로그인이 필요합니다. 로그인 페이지로 이동합니다.");
    redirectTimerRef.current = window.setTimeout(() => {
      router.push(`/login?redirect=${encodeURIComponent(`/write?category=${category}`)}`);
    }, 900);

    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [category, isLoading, router, user]);

  const submitPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const content = editorRef.current?.getMarkdown().trim() ?? "";
    const { tags, error: tagError } = validateTags(tagInput);
    const contentWithTags = tags.length > 0 ? `${content}\n\n${tags.map((tag) => `#${tag}`).join(" ")}` : content;

    if (!title.trim()) {
      setError("게시글 제목을 입력해 주세요.");
      return;
    }

    if (!content) {
      setError("본문을 입력해 주세요.");
      editorRef.current?.focus();
      return;
    }

    if (tagError) {
      setError(tagError);
      return;
    }

    setIsSubmitting(true);

    try {
      if (category === "ROUTINE") {
        await api.post("/routines", {
          title,
          summary: getPlainSummary(content),
          content: contentWithTags,
        });
      } else {
        await api.post("/posts", {
          category,
          title,
          content: contentWithTags,
        });
      }

      editorRef.current?.destroy();
      router.push(selectedCategory.redirectPath);
      router.refresh();
    } catch {
      setError("작성 내용을 저장하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-950">작성하기</h1>
        <p className="mt-2 text-sm text-slate-600">운동 기록, 자유 글, 루틴을 한 곳에서 작성합니다.</p>
      </header>

      {!canWrite ? (
        <p role="status" className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {authStatusMessage}
        </p>
      ) : (
        <form onSubmit={submitPost} className="space-y-5">
          {notice && <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
          {error && <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
            <div>
              <label htmlFor="write-category" className="mb-1.5 block text-sm font-medium text-slate-700">
                카테고리
              </label>
              <select
                id="write-category"
                value={category}
                onChange={(event) => setCategory(event.target.value as WriteCategory)}
                className="input-style"
                disabled={isSubmitting || isLoading || !user}
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="write-title" className="mb-1.5 block text-sm font-medium text-slate-700">
                게시글 제목
              </label>
              <input
                id="write-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="input-style"
                maxLength={180}
                placeholder="제목을 입력해 주세요"
                disabled={isSubmitting || isLoading || !user}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">본문</label>
            <MarkdownEditor ref={editorRef} placeholder="운동 내용, 루틴 설명, 공유하고 싶은 이야기를 작성해 주세요." />
          </div>

          <div>
            <label htmlFor="write-tags" className="mb-1.5 block text-sm font-medium text-slate-700">
              태그
            </label>
            <input
              id="write-tags"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              className="input-style"
              placeholder="#가슴, #벤치프레스, #오운완 처럼 콤마로 구분해 주세요"
              disabled={isSubmitting || isLoading || !user}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || isLoading || !user}
              className="rounded bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "저장 중" : "저장하기"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
