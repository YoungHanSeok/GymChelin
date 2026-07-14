"use client";

import WriteEntryButton, { type WriteCategory } from "@/components/community/WriteEntryButton";
import { useState } from "react";

export type CommunitySortOption<SortKey extends string> = {
  key: SortKey;
  label: string;
};

type CommunityContentToolbarProps<SortKey extends string> = {
  sortOptions: CommunitySortOption<SortKey>[];
  sortKey: SortKey;
  onSortChange: (sortKey: SortKey) => void;
  writeCategory: WriteCategory;
};

export default function CommunityContentToolbar<SortKey extends string>({
  sortOptions,
  sortKey,
  onSortChange,
  writeCategory,
}: CommunityContentToolbarProps<SortKey>) {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const selectedSortLabel = sortOptions.find((option) => option.key === sortKey)?.label ?? sortOptions[0]?.label ?? "";

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-b border-slate-200 pb-4">
      <div className="relative">
        <button
          type="button"
          aria-label={`정렬 메뉴 열기, 현재 ${selectedSortLabel}`}
          aria-expanded={isSortOpen}
          aria-haspopup="menu"
          onClick={() => setIsSortOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded border border-slate-300 text-slate-700 hover:border-emerald-600 hover:text-emerald-700"
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
  );
}
