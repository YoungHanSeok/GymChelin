"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthSession } from "@/lib/auth-session";

type Theme = "light" | "dark";

const navItems = [
  { href: "/boards/workout-log", label: "운동일지" },
  { href: "/boards/free", label: "자유게시판" },
  { href: "/routines", label: "나의 루틴" },
  { href: "/wiki", label: "웨이트 위키" },
  { href: "/gyms", label: "헬스장 리뷰" },
];

const themeStorageKey = "gymchelin-theme";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function getAppliedTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" || document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
}

function readStoredTheme() {
  try {
    return window.localStorage.getItem(themeStorageKey);
  } catch {
    return null;
  }
}

function saveTheme(theme: Theme) {
  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch {
    return;
  }
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const storedTheme = readStoredTheme();
    const nextTheme = isTheme(storedTheme) ? storedTheme : mediaQuery.matches ? "dark" : "light";

    setTheme(nextTheme);
    applyTheme(nextTheme);

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (isTheme(readStoredTheme())) {
        return;
      }

      const systemTheme = event.matches ? "dark" : "light";
      setTheme(systemTheme);
      applyTheme(systemTheme);
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = getAppliedTheme() === "dark" ? "light" : "dark";

    applyTheme(nextTheme);
    saveTheme(nextTheme);
    setTheme(nextTheme);
  };

  const isDark = theme === "dark";
  const label = isDark ? "밝은 모드로 변경" : "어두운 모드로 변경";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 transition hover:border-emerald-600 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-400 dark:hover:text-emerald-300 dark:focus:ring-emerald-900/40"
    >
      {isDark ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      )}
    </button>
  );
}

export default function Header() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuthSession();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    router.push("/");
    router.refresh();
  };

  const authControl = user ? (
    <div className="hidden items-center gap-2 md:flex">
      <span className="max-w-32 truncate text-sm font-medium text-slate-600">{user.nickname}</span>
      <button
        type="button"
        onClick={handleLogout}
        className="inline-flex h-10 items-center rounded border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:border-emerald-600 hover:text-emerald-700"
      >
        로그아웃
      </button>
    </div>
  ) : (
    <Link
      href="/login"
      className="hidden h-10 items-center rounded bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-emerald-700 md:inline-flex"
    >
      로그인
    </Link>
  );

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

        <form className="ml-auto hidden w-full max-w-72 md:block">
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

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle />
        </div>

        {isLoading ? <div aria-hidden="true" className="hidden h-10 w-14 shrink-0 md:block" /> : authControl}

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="h-10 rounded border border-slate-300 px-3 text-sm font-semibold text-slate-700 md:hidden"
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
            {user ? (
              <button
                type="button"
                className="mt-2 rounded border border-slate-300 px-2 py-2 text-center text-sm font-semibold text-slate-700"
                onClick={handleLogout}
              >
                로그아웃
              </button>
            ) : (
              <Link
                href="/login"
                className="mt-2 rounded bg-slate-950 px-2 py-2 text-center text-sm font-semibold text-white"
                onClick={() => setIsOpen(false)}
              >
                로그인
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
