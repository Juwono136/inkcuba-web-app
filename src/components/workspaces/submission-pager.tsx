"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZES = [6, 12, 24, 48] as const;

type SubmissionPagerProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
};

export function SubmissionPager({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: SubmissionPagerProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = pageWindow(page, totalPages);

  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-center text-sm text-slate-600 lg:text-left">
        Showing{" "}
        <span className="font-semibold text-slate-900">
          {from}–{to}
        </span>{" "}
        of <span className="font-semibold text-slate-900">{total}</span>
      </p>
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:w-auto lg:justify-end">
        {onPageSizeChange ? (
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-10 w-full rounded-xl border-2 border-slate-900 sm:w-[7.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <div className="flex w-full items-center justify-between gap-1.5 sm:w-auto sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 border-slate-900 px-2.5 sm:px-3"
            disabled={page <= 1}
            aria-label="Previous page"
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Prev</span>
          </Button>
          <div className="hidden items-center gap-1 md:flex">
            {pages.map((item) => (
              <Button
                key={item}
                type="button"
                variant={item === page ? "default" : "outline"}
                size="sm"
                className={
                  item === page
                    ? "h-10 min-w-10 bg-slate-900 px-2 text-white hover:bg-slate-800"
                    : "h-10 min-w-10 border-slate-300 px-2"
                }
                aria-label={`Page ${item}`}
                aria-current={item === page ? "page" : undefined}
                onClick={() => onPageChange(item)}
              >
                {item}
              </Button>
            ))}
          </div>
          <span className="min-w-14 text-center text-sm font-semibold text-slate-700 md:hidden">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 border-slate-900 px-2.5 sm:px-3"
            disabled={page >= totalPages}
            aria-label="Next page"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function pageWindow(page: number, totalPages: number): number[] {
  const size = 5;
  let start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + size - 1);
  start = Math.max(1, end - size + 1);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
