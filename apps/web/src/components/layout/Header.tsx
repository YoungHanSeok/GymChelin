"use client";

// 전역 메뉴, 인증 상태, 사용자 메뉴를 표시하는 헤더다.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Modal from "@/app/_components/modalComponent";
import { isAdminRole, isSuperAdminRole, useAuthSession } from "@/lib/auth-session";

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
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAccountOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountOpen]);

  const closeLogoutModal = () => {
    if (isLoggingOut) {
      return;
    }

    setIsLogoutModalOpen(false);
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await logout();
    } catch {
      // 로그아웃 API 오류가 발생해도 로컬 세션은 auth-session에서 정리된다.
    } finally {
      setIsLoggingOut(false);
      setIsLogoutModalOpen(false);
      setIsOpen(false);
      setIsAccountOpen(false);
      router.replace("/login");
      router.refresh();
    }
  };

  const userIsAdmin = isAdminRole(user?.role);
  const userIsSuperAdmin = isSuperAdminRole(user?.role);

  const authControl = user ? (
    <div ref={accountMenuRef} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setIsAccountOpen((value) => !value)}
        aria-expanded={isAccountOpen}
        aria-haspopup="menu"
        className="inline-flex h-10 max-w-44 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-600 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
      >
        <span className="truncate">{user.nickname}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isAccountOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-40 overflow-hidden rounded border border-slate-200 bg-white py-1 shadow-lg"
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setIsAccountOpen(false)}
            className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
          >
            프로필
          </Link>
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setIsAccountOpen(false)}
            className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
          >
            계정관리
          </Link>
          {userIsSuperAdmin ? (
            <div role="group" aria-label="최고 관리자 기능" className="mt-1 border-t border-slate-200 pt-1">
              <p className="px-4 py-1.5 text-xs font-bold text-slate-500">최고 관리자 기능</p>
              <Link
                href="/admin/ads"
                role="menuitem"
                onClick={() => setIsAccountOpen(false)}
                className="block px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              >
                배너 관리
              </Link>
              <Link
                href="/admin/users"
                role="menuitem"
                onClick={() => setIsAccountOpen(false)}
                className="block px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              >
                관리자 임명
              </Link>
            </div>
          ) : userIsAdmin ? (
            <div role="group" aria-label="관리자 기능" className="mt-1 border-t border-slate-200 pt-1">
              <p className="px-4 py-1.5 text-xs font-bold text-slate-500">관리자 기능</p>
              <Link
                href="/admin/routine-exercises"
                role="menuitem"
                onClick={() => setIsAccountOpen(false)}
                className="block px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              >
                루틴 운동추가
              </Link>
            </div>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => setIsLogoutModalOpen(true)}
            className="block w-full px-4 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  ) : (
    <Link
      href="/login"
      className="hidden h-10 items-center rounded bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-emerald-700 lg:inline-flex"
    >
      로그인
    </Link>
  );

  return (
    <>
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

        <form className="ml-auto hidden w-full max-w-72 lg:block">
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

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <ThemeToggle />
        </div>

        {isLoading ? <div aria-hidden="true" className="hidden h-10 w-14 shrink-0 lg:block" /> : authControl}

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="h-10 rounded border border-slate-300 px-3 text-sm font-semibold text-slate-700 lg:hidden"
        >
          메뉴
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
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
              <>
                <div className="mt-2 border-t border-slate-200 pt-2 text-sm font-semibold text-slate-900">
                  {user.nickname}
                </div>
                <Link
                  href="/profile"
                  className="rounded px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  onClick={() => setIsOpen(false)}
                >
                  프로필
                </Link>
                <Link
                  href="/account"
                  className="rounded px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  onClick={() => setIsOpen(false)}
                >
                  계정관리
                </Link>
                {userIsSuperAdmin ? (
                  <div className="mt-1 border-t border-slate-200 pt-2">
                    <p className="px-2 pb-1 text-xs font-bold text-slate-500">최고 관리자 기능</p>
                    <Link
                      href="/admin/ads"
                      className="block rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      onClick={() => setIsOpen(false)}
                    >
                      배너 관리
                    </Link>
                    <Link
                      href="/admin/users"
                      className="block rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      onClick={() => setIsOpen(false)}
                    >
                      관리자 임명
                    </Link>
                  </div>
                ) : userIsAdmin ? (
                  <div className="mt-1 border-t border-slate-200 pt-2">
                    <p className="px-2 pb-1 text-xs font-bold text-slate-500">관리자 기능</p>
                    <Link
                      href="/admin/routine-exercises"
                      className="block rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      onClick={() => setIsOpen(false)}
                    >
                      루틴 운동추가
                    </Link>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="rounded border border-slate-300 px-2 py-2 text-center text-sm font-semibold text-slate-700"
                  onClick={() => setIsLogoutModalOpen(true)}
                >
                  로그아웃
                </button>
              </>
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

      {isLogoutModalOpen && (
        <Modal onClose={closeLogoutModal} ariaLabelledBy="logout-confirm-title">
          <h2 id="logout-confirm-title" className="pr-8 text-xl font-bold text-slate-950">
            로그아웃 하시겠습니까?
          </h2>
          <p className="mt-3 text-sm text-slate-600">현재 계정에서 로그아웃합니다.</p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeLogoutModal}
              disabled={isLoggingOut}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
              aria-busy={isLoggingOut}
              className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
