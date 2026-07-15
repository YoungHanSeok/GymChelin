"use client";

// 게시판 검색 조건과 글쓰기 진입 동작을 제공한다.
import WriteEntryButton, { type WriteCategory } from "@/components/community/WriteEntryButton";
import type { CommunitySearchType } from "@/lib/community-types";
import { type FormEvent, useEffect, useState } from "react";

export type CommunitySortOption<SortKey extends string> = {
  key: SortKey;
  label: string;
};

type CommunityContentToolbarProps<SortKey extends string> = {
  sortOptions: CommunitySortOption<SortKey>[];
  sortKey: SortKey;
  onSortChange: (sortKey: SortKey) => void;
  searchType?: CommunitySearchType;
  keyword?: string;
  onSearch?: (searchType: CommunitySearchType, keyword: string) => void;
  writeCategory: WriteCategory;
  disabled?: boolean;
};

export default function CommunityContentToolbar<SortKey extends string>({
  sortOptions,
  sortKey,
  onSortChange,
  searchType,
  keyword,
  onSearch,
  writeCategory,
  disabled = false,
}: CommunityContentToolbarProps<SortKey>) {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [draftSearchType, setDraftSearchType] = useState<CommunitySearchType>(searchType ?? "title");
  const [draftKeyword, setDraftKeyword] = useState(keyword ?? "");
  const selectedSortLabel = sortOptions.find((option) => option.key === sortKey)?.label ?? sortOptions[0]?.label ?? "";

  useEffect(() => {
    setDraftSearchType(searchType ?? "title");
    setDraftKeyword(keyword ?? "");
  }, [keyword, searchType]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch?.(draftSearchType, draftKeyword.trim());
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
      {onSearch && (
        <form onSubmit={submitSearch} className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <label htmlFor={`community-search-type-${writeCategory}`} className="sr-only">
            검색 유형
          </label>
          <select
            id={`community-search-type-${writeCategory}`}
            value={draftSearchType}
            disabled={disabled}
            onChange={(event) => setDraftSearchType(event.target.value as CommunitySearchType)}
            className="h-10 shrink-0 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:border-emerald-600 focus:outline-none disabled:bg-slate-100"
          >
            <option value="title">제목</option>
            <option value="titleContent">제목+내용</option>
            <option value="author">작성자</option>
          </select>
          <label htmlFor={`community-search-keyword-${writeCategory}`} className="sr-only">
            검색어
          </label>
          <input
            id={`community-search-keyword-${writeCategory}`}
            type="search"
            value={draftKeyword}
            disabled={disabled}
            onChange={(event) => setDraftKeyword(event.target.value)}
            placeholder="검색어를 입력해 주세요"
            maxLength={100}
            className="h-10 min-w-0 flex-1 rounded border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none disabled:bg-slate-100 sm:w-56"
          />
          <button
            type="submit"
            aria-label={writeCategory === "ROUTINE" ? "루틴 검색" : "게시글 검색"}
            disabled={disabled}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded border border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
          </button>
        </form>
      )}

      <div className="ml-auto flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            aria-label={`정렬 메뉴 열기, 현재 ${selectedSortLabel}`}
            aria-expanded={isSortOpen}
            aria-haspopup="menu"
            disabled={disabled}
            onClick={() => setIsSortOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded border border-slate-300 text-slate-700 hover:border-emerald-600 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
              <path d="m8 20 4 3 4-3" />
            </svg>
          </button>
          {isSortOpen && (
            <div role="menu" className="absolute right-0 top-12 z-20 w-32 rounded border border-slate-200 bg-white py-1 shadow-lg">
              {sortOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  onClick={() => {
                    onSortChange(option.key);
                    setIsSortOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm ${
                    sortKey === option.key
                      ? "font-semibold text-emerald-700"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <WriteEntryButton category={writeCategory}>작성하기</WriteEntryButton>
      </div>
    </div>
  );
}
