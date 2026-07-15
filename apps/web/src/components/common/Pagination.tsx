"use client";

// 목록 화면에서 재사용하는 페이지 이동 UI를 제공한다.
type PaginationToken = number | "ellipsis-start" | "ellipsis-end";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  disabled?: boolean;
  ariaLabel?: string;
  onPageChange: (page: number) => void;
};

const createPaginationTokens = (currentPage: number, totalPages: number): PaginationToken[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-end", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis-start", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis-start", currentPage - 1, currentPage, currentPage + 1, "ellipsis-end", totalPages];
};

export default function Pagination({
  currentPage,
  totalPages,
  disabled = false,
  ariaLabel = "목록 페이지",
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 0) {
    return null;
  }

  const normalizedCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const tokens = createPaginationTokens(normalizedCurrentPage, totalPages);
  const buttonClassName =
    "inline-flex h-9 min-w-9 items-center justify-center rounded border px-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <nav aria-label={ariaLabel} className="flex max-w-full items-center gap-1 overflow-x-auto pb-1">
      <button
        type="button"
        disabled={disabled || normalizedCurrentPage === 1}
        onClick={() => onPageChange(normalizedCurrentPage - 1)}
        className={`${buttonClassName} border-slate-300 text-slate-700 hover:border-emerald-600 hover:text-emerald-700`}
      >
        ‹ 이전
      </button>

      {tokens.map((token) => {
        if (typeof token !== "number") {
          return (
            <span key={token} aria-hidden="true" className="inline-flex h-9 min-w-7 items-center justify-center text-slate-400">
              …
            </span>
          );
        }

        const isCurrent = token === normalizedCurrentPage;

        return (
          <button
            key={token}
            type="button"
            aria-label={`${token}페이지`}
            aria-current={isCurrent ? "page" : undefined}
            disabled={disabled || isCurrent}
            onClick={() => onPageChange(token)}
            className={`${buttonClassName} ${
              isCurrent
                ? "border-emerald-700 bg-emerald-700 text-white disabled:opacity-100"
                : "border-slate-300 text-slate-700 hover:border-emerald-600 hover:text-emerald-700"
            }`}
          >
            {token}
          </button>
        );
      })}

      <button
        type="button"
        disabled={disabled || normalizedCurrentPage === totalPages}
        onClick={() => onPageChange(normalizedCurrentPage + 1)}
        className={`${buttonClassName} border-slate-300 text-slate-700 hover:border-emerald-600 hover:text-emerald-700`}
      >
        다음 ›
      </button>
    </nav>
  );
}
