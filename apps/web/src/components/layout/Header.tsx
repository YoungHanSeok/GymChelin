"use client";

import Link from "next/link";
import { useState } from "react";

const navItems = [
  { href: "/boards/workout-log", label: "운동일지" },
  { href: "/boards/free", label: "자유게시판" },
  { href: "/routines", label: "나의 루틴" },
  { href: "/wiki", label: "웨이트 위키" },
  { href: "/gyms", label: "헬스장 리뷰" },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="shrink-0 text-xl font-black tracking-normal text-slate-950">
          짐슐랭
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form className="ml-auto hidden min-w-72 max-w-md flex-1 md:block">
          <label htmlFor="site-search" className="sr-only">
            검색
          </label>
          <input
            id="site-search"
            name="q"
            placeholder="운동, 루틴, 헬스장을 검색해 보세요"
            className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
          />
        </form>

        <Link
          href="/login"
          className="hidden rounded bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 md:inline-flex"
        >
          로그인
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="ml-auto rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 md:hidden"
        >
          메뉴
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <form className="mb-3">
            <input
              name="q"
              placeholder="검색"
              className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </form>
          <nav className="grid gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="mt-2 rounded bg-slate-950 px-2 py-2 text-center text-sm font-semibold text-white"
              onClick={() => setIsOpen(false)}
            >
              로그인
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
