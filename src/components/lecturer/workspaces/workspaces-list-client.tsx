"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { WorkspaceDefaultBackground } from "@/components/lecturer/workspaces/workspace-form";
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
import {
  optionsForCategory,
  useAllDirectoryOptions,
} from "@/hooks/use-directory-options";
import { cn } from "@/lib/utils";
import type {
  WorkspaceListPage,
  WorkspaceListSortField,
  WorkspaceListStatusFilter,
  WorkspaceStatus,
} from "@/lib/workspaces/types";
import {
  WORKSPACE_LIST_DEFAULT_PAGE_SIZE,
  WORKSPACE_STATUS_LABELS,
} from "@/lib/workspaces/types";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

const PAGE_SIZE_OPTIONS = [6, 12, 24, 48] as const;

function statusBadgeClass(status: WorkspaceStatus): string {
  switch (status) {
    case "ACTIVE":
      return "border-inkcuba-navy bg-emerald-100 text-emerald-800";
    case "DRAFT":
      return "border-inkcuba-navy bg-amber-100 text-amber-900";
    case "INACTIVE":
      return "border-inkcuba-navy bg-slate-100 text-slate-600";
  }
}

const SORT_OPTIONS: { value: WorkspaceListSortField; label: string }[] = [
  { value: "updatedAt", label: "Last updated" },
  { value: "createdAt", label: "Date created" },
  { value: "name", label: "Name" },
  { value: "className", label: "Class" },
  { value: "semester", label: "Semester" },
];

async function fetchWorkspaces(params: {
  page: number;
  pageSize: number;
  q: string;
  semester: string;
  status: WorkspaceListStatusFilter;
  sortBy: WorkspaceListSortField;
  sortDir: "asc" | "desc";
}): Promise<WorkspaceListPage> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    sortBy: params.sortBy,
    sortDir: params.sortDir,
    status: params.status,
  });
  if (params.q) search.set("q", params.q);
  if (params.semester) search.set("semester", params.semester);

  const response = await fetch(`/api/lecturer/workspaces?${search}`);
  const payload = (await response.json()) as ApiEnvelope<WorkspaceListPage>;
  if (!payload.success) {
    throw new Error(payload.error?.message || "Failed to load workspaces");
  }
  return payload.data;
}

function formatUpdatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function WorkspacesListClient() {
  const directoryQuery = useAllDirectoryOptions();
  const semesterOptions = useMemo(
    () => optionsForCategory(directoryQuery.data, "semester"),
    [directoryQuery.data],
  );

  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [semester, setSemester] = useState("");
  const [status, setStatus] = useState<WorkspaceListStatusFilter>("ALL");
  const [sortBy, setSortBy] = useState<WorkspaceListSortField>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(
    WORKSPACE_LIST_DEFAULT_PAGE_SIZE,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQ(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const query = useQuery({
    queryKey: [
      "lecturer-workspaces",
      page,
      pageSize,
      debouncedQ,
      semester,
      status,
      sortBy,
      sortDir,
    ],
    queryFn: () =>
      fetchWorkspaces({
        page,
        pageSize,
        q: debouncedQ,
        semester,
        status,
        sortBy,
        sortDir,
      }),
  });

  const hasFilters =
    Boolean(debouncedQ) || Boolean(semester) || status !== "ALL";

  const activeFilterCount =
    (debouncedQ ? 1 : 0) + (semester ? 1 : 0) + (status !== "ALL" ? 1 : 0);

  const emptyBecauseFilters =
    query.data && query.data.total === 0 && hasFilters;

  const clearFilters = () => {
    setSearchInput("");
    setDebouncedQ("");
    setSemester("");
    setStatus("ALL");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 sm:text-3xl">
            Workspaces
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Create a class workspace, manage people, collect submissions, and
            score student portfolios — starting with workspace info.
          </p>
        </div>
        <Button
          asChild
          className="bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600"
        >
          <Link href="/dashboard/lecturer/workspaces/new">
            <Plus className="h-4 w-4" />
            Create workspace
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border-2 border-inkcuba-navy bg-white p-3 shadow-inkcuba sm:p-5">
        <div className="flex items-center gap-2 md:hidden">
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1 justify-between border-2 border-slate-900 px-3"
            aria-expanded={filtersOpen}
            aria-controls="workspace-list-filters"
            onClick={() => setFiltersOpen((prev) => !prev)}
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
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                filtersOpen && "rotate-180",
              )}
            />
          </Button>
          {hasFilters ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 border-2 border-slate-900"
              aria-label="Clear filters"
              onClick={clearFilters}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        <div
          id="workspace-list-filters"
          className={cn(
            "grid gap-3 lg:grid-cols-12",
            filtersOpen ? "mt-3" : "hidden",
            "md:mt-0 md:grid",
          )}
        >
          <div className="space-y-2 lg:col-span-4">
            <Label htmlFor="workspace-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="workspace-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search name, class, semester…"
                className="rounded-xl border-2 border-slate-900 bg-white pl-9"
              />
            </div>
          </div>

          <div className="space-y-2 lg:col-span-3">
            <Label>Semester</Label>
            <Select
              value={semester || "__all__"}
              onValueChange={(value) => {
                setSemester(value === "__all__" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-2 border-slate-900 bg-white">
                <SelectValue placeholder="All semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All semesters</SelectItem>
                {semesterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as WorkspaceListStatusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-2 border-slate-900 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 lg:col-span-3">
            <Label>Sort</Label>
            <div className="flex gap-2">
              <Select
                value={sortBy}
                onValueChange={(value) => {
                  setSortBy(value as WorkspaceListSortField);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 flex-1 rounded-xl border-2 border-slate-900 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0 border-2 border-slate-900 px-3"
                aria-label={
                  sortDir === "asc" ? "Sort ascending" : "Sort descending"
                }
                onClick={() => {
                  setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
                  setPage(1);
                }}
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

      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-2xl border-2 border-slate-200 bg-slate-50"
            />
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          {(query.error as Error).message || "Unable to load workspaces."}
        </div>
      ) : !query.data || query.data.total === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-inkcuba-navy bg-white p-8 text-center shadow-inkcuba">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-inkcuba-navy bg-sky-50 text-inkcuba-purple">
            <FolderKanban className="h-6 w-6" />
          </div>
          <h2 className="font-heading text-lg font-bold text-slate-900">
            {emptyBecauseFilters ? "No matching workspaces" : "No workspaces yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            {emptyBecauseFilters
              ? "Try clearing search or filters to see more results."
              : "Create your first workspace to start collecting and verifying student portfolio submissions."}
          </p>
          {emptyBecauseFilters ? (
            <Button
              type="button"
              variant="outline"
              className="mt-5 border-slate-900"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          ) : (
            <Button
              asChild
              className="mt-5 bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600"
            >
              <Link href="/dashboard/lecturer/workspaces/new">
                <Plus className="h-4 w-4" />
                Create workspace
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {query.data.items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.24) }}
              >
                <Link
                  href={`/dashboard/lecturer/workspaces/${item.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-inkcuba-navy bg-white shadow-inkcuba transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="relative aspect-[2/1] w-full overflow-hidden">
                    {item.backgroundImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.backgroundImageUrl}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <WorkspaceDefaultBackground
                        compact
                        className="h-full w-full"
                      />
                    )}
                    <span
                      className={cn(
                        "absolute top-3 right-3 rounded-full border-2 px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase shadow-sm",
                        statusBadgeClass(item.status),
                      )}
                    >
                      {WORKSPACE_STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="min-w-0 space-y-1">
                      <h2 className="font-heading line-clamp-2 text-base font-bold text-slate-900 group-hover:text-inkcuba-purple">
                        {item.name}
                      </h2>
                      <p className="text-xs font-medium text-slate-600">
                        Class {item.className}
                      </p>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 font-semibold text-inkcuba-navy">
                        <Calendar className="h-3 w-3" />
                        {item.semesterLabel}
                      </span>
                      <span className="ml-auto">
                        Updated {formatUpdatedAt(item.updatedAt)}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border-2 border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <p className="text-center text-xs text-slate-600 sm:text-left sm:text-sm">
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {(query.data.page - 1) * query.data.pageSize + 1}–
                {Math.min(
                  query.data.page * query.data.pageSize,
                  query.data.total,
                )}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">
                {query.data.total}
              </span>
              {hasFilters ? " (filtered)" : ""}
            </p>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[6.75rem] shrink-0 rounded-xl border-2 border-slate-900 sm:w-[7.5rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-slate-900 px-2 sm:px-3"
                  disabled={query.data.page <= 1}
                  aria-label="Previous page"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Prev</span>
                </Button>
                <span className="min-w-[3.5rem] text-center text-xs font-semibold text-slate-700 sm:min-w-[4.5rem]">
                  {query.data.page} / {query.data.totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-slate-900 px-2 sm:px-3"
                  disabled={query.data.page >= query.data.totalPages}
                  aria-label="Next page"
                  onClick={() =>
                    setPage((prev) =>
                      Math.min(query.data?.totalPages ?? prev, prev + 1),
                    )
                  }
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
