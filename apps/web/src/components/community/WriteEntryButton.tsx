"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuthSession } from "@/lib/auth-session";

export type WriteCategory = "WORKOUT_LOG" | "FREE" | "ROUTINE";

const defaultClassName = "rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700";

export default function WriteEntryButton({
  category,
  children = "작성하기",
  className = defaultClassName,
}: {
  category: WriteCategory;
  children?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const { user, isLoading } = useAuthSession();
  const [notice, setNotice] = useState(false);
  const timerRef = useRef<number | null>(null);
  const writePath = category === "ROUTINE" ? "/routines/write" : `/write?category=${category}`;

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const moveToWrite = () => {
    if (isLoading) {
      return;
    }

    if (!user) {
      setNotice(true);

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        router.push(`/login?redirect=${encodeURIComponent(writePath)}`);
      }, 900);
      return;
    }

    router.push(writePath);
  };

  return (
    <>
      <button type="button" onClick={moveToWrite} disabled={isLoading} className={className}>
        {children}
      </button>
      {notice && (
        <div
          role="alert"
          className="fixed right-4 top-20 z-50 rounded border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-lg"
        >
          로그인이 필요합니다. 로그인 페이지로 이동합니다.
        </div>
      )}
    </>
  );
}
