"use client";

import { ArrowDownAZ, ArrowUpAZ, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { LecturerProjectSortField } from "@/lib/projects/validators";

const STATUS_OPTIONS = [
  { value: "NEEDS_ATTENTION", label: "Ready to score" },
  { value: "ALL", label: "All submitted" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "REVISED", label: "Revised" },
  { value: "NEED_REVISION", label: "Need revision" },
  { value: "PUBLISHED", label: "Published" },
] as const;

const SORT_OPTIONS: Array<{ value: LecturerProjectSortField; label: string }> = [
  { value: "updatedAt", label: "Last updated" },
  { value: "title", label: "Title" },
  { value: "status", label: "Status" },
];

type ScoringToolbarProps = {
  q: string;
  onQChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  sortBy: LecturerProjectSortField;
  onSortByChange: (value: LecturerProjectSortField) => void;
  sortDir: "asc" | "desc";
  onSortDirChange: (value: "asc" | "desc") => void;
  onClear: () => void;
  hasFilters: boolean;
  activeFilterCount: number;
};

export function ScoringToolbar({
  q,
  onQChange,
  status,
  onStatusChange,
  sortBy,
  onSortByChange,
  sortDir,
  onSortDirChange,
  onClear,
  hasFilters,
  activeFilterCount,
}: ScoringToolbarProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border-2 border-inkcuba-navy bg-white p-3 shadow-inkcuba sm:p-4">
      <div className="flex items-center gap-2 md:hidden">
        <Button
          type="button"
          variant="outline"
          className="h-10 flex-1 justify-between border-2 border-slate-900 px-3"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4" />
            Search & filters
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-inkcuba-purple px-2 py-0.5 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </Button>
        {hasFilters ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 border-2 border-slate-900"
            aria-label="Clear filters"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div
        className={cn(
          "grid gap-3 md:grid-cols-2 xl:grid-cols-12",
          open ? "mt-3" : "hidden",
          "md:mt-0 md:grid",
        )}
      >
        <div className="space-y-1.5 xl:col-span-5">
          <Label htmlFor="scoring-search">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="scoring-search"
              value={q}
              onChange={(event) => onQChange(event.target.value)}
              placeholder="Search by project, submission, or student…"
              className="h-10 rounded-xl border-2 border-slate-900 bg-white pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5 xl:col-span-3">
          <Label>Status</Label>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-10 w-full rounded-xl border-2 border-slate-900 bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 md:col-span-2 xl:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <Label>Sort</Label>
            {hasFilters ? (
              <button
                type="button"
                className="hidden text-xs font-semibold text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline md:inline"
                onClick={onClear}
              >
                Clear filters
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Select
              value={sortBy}
              onValueChange={(value) => onSortByChange(value as LecturerProjectSortField)}
            >
              <SelectTrigger className="h-10 min-w-0 flex-1 rounded-xl border-2 border-slate-900 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((field) => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 border-2 border-slate-900"
              aria-label={sortDir === "asc" ? "Sort ascending" : "Sort descending"}
              onClick={() => onSortDirChange(sortDir === "asc" ? "desc" : "asc")}
            >
              {sortDir === "asc" ? (
                <ArrowUpAZ className="h-4 w-4" />
              ) : (
                <ArrowDownAZ className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
