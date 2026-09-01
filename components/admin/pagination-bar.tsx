"use client";

import {ChevronLeft, ChevronRight} from "lucide-react";

export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_PAGE_SIZE: PageSize = 10;

// Shared "Show N per page" + Prev/Next footer for every admin list panel
// (Products, Body Shapes, Orders, Custom Requests  -  deliberately not
// Customers, which has its own dedicated view, and not Hero Cards, whose
// drag-and-drop reordering needs the full list on screen at once to make
// sense). One component so every list paginates identically instead of
// five subtly different homegrown paginators.
export function PaginationBar({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7ddc6] pt-4">
      <label className="flex items-center gap-2 text-xs text-forest-600">
        Show
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value) as PageSize)}
          className="rounded-full border border-[#d4c5ab] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-forest-800 outline-none focus:border-forest-400"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        per page · {totalItems} total
      </label>

      {totalPages > 1 ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            aria-label="Previous page"
            className="button-lift flex h-8 w-8 items-center justify-center rounded-full border border-[#d4c5ab] text-forest-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-forest-600">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            aria-label="Next page"
            className="button-lift flex h-8 w-8 items-center justify-center rounded-full border border-[#d4c5ab] text-forest-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
