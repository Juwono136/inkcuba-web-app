"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Link2,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { WorkspaceDefaultBackground } from "@/components/lecturer/workspaces/workspace-form";
import { Button } from "@/components/ui/button";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
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
import type { StudentWorkspaceListPage } from "@/lib/workspaces/student-service";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

async function fetchStudentWorkspaces(params: {
  page: number;
  pageSize: number;
  q: string;
  semester: string;
  className: string;
}): Promise<StudentWorkspaceListPage> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set("q", params.q);
  if (params.semester) search.set("semester", params.semester);
  if (params.className) search.set("className", params.className);

  const response = await fetch(`/api/student/workspaces?${search}`);
  const payload =
    (await response.json()) as ApiEnvelope<StudentWorkspaceListPage>;
  if (!payload.success) {
    throw new Error(payload.error?.message || "Failed to load workspaces");
  }
  return payload.data;
}

export function StudentWorkspacesListClient() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [semester, setSemester] = useState("");
  const [className, setClassName] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [q]);

  const query = useQuery({
    queryKey: [
      "student-workspaces",
      page,
      pageSize,
      debouncedQ,
      semester,
      className,
    ],
    queryFn: () =>
      fetchStudentWorkspaces({
        page,
        pageSize,
        q: debouncedQ,
        semester,
        className,
      }),
    placeholderData: (previous) => previous,
  });

  const facets = query.data?.facets;
  const hasActiveFilters =
    Boolean(debouncedQ) || Boolean(semester) || Boolean(className);
  const activeFilterCount =
    (debouncedQ ? 1 : 0) + (semester ? 1 : 0) + (className ? 1 : 0);

  function clearFilters() {
    setQ("");
    setDebouncedQ("");
    setSemester("");
    setClassName("");
    setPage(1);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <section className="overflow-hidden rounded-3xl border-2 border-inkcuba-navy bg-white shadow-inkcuba">
        <div className="border-b-2 border-inkcuba-navy bg-gradient-to-r from-sky-100 via-violet-50 to-amber-100 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-[0.14em] text-inkcuba-navy uppercase">
                Student workspaces
              </p>
              <h1 className="mt-1 font-heading text-2xl font-bold text-slate-900 sm:text-3xl">
                My workspaces
              </h1>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                Class workspaces you joined via invite or lecturer enrollment —
                open one to view details and upcoming submissions.
              </p>
            </div>
            <Button
              asChild
              className="bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600"
            >
              <Link href="/join">
                <Link2 className="h-4 w-4" />
                Join with code
              </Link>
            </Button>
          </div>
        </div>

        <div className="space-y-3 p-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-2 md:hidden">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1 justify-between border-2 border-slate-900 px-3"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
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
                  "h-4 w-4 transition",
                  filtersOpen && "rotate-180",
                )}
              />
            </Button>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 w-10 shrink-0 border-2 border-slate-900"
                aria-label="Clear filters"
                onClick={clearFilters}
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          <div
            className={cn(
              "grid gap-3 lg:grid-cols-12",
              filtersOpen ? "mt-1" : "hidden",
              "md:mt-0 md:grid",
            )}
          >
            <div className="space-y-2 lg:col-span-4">
              <Label htmlFor="student-workspace-search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="student-workspace-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, class, or lecturer…"
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
                  {(facets?.semesters ?? []).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:col-span-3">
              <Label>Class</Label>
              <Select
                value={className || "__all__"}
                onValueChange={(value) => {
                  setClassName(value === "__all__" ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-2 border-slate-900 bg-white">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All classes</SelectItem>
                  {(facets?.classNames ?? []).map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2 lg:col-span-2">
              <div className="w-full space-y-2">
                <Label>Per page</Label>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-2 border-slate-900 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[6, 12, 24, 48].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mb-0 hidden h-10 w-10 shrink-0 border-2 border-slate-900 md:inline-flex"
                  aria-label="Clear filters"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {query.isLoading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <InkcubaLoader label="Loading workspaces…" />
        </div>
      ) : query.isError ? (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {query.error instanceof Error
            ? query.error.message
            : "Unable to load workspaces"}
        </div>
      ) : !query.data || query.data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-inkcuba-navy bg-white px-6 py-16 text-center shadow-inkcuba">
          <FolderKanban className="h-10 w-10 text-inkcuba-purple" />
          <p className="max-w-sm text-sm text-slate-600">
            {hasActiveFilters
              ? "No workspaces match your filters."
              : "No workspaces yet. Ask your lecturer for an invite link or code."}
          </p>
          {hasActiveFilters ? (
            <Button
              type="button"
              variant="outline"
              className="border-slate-900"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          ) : (
            <Button
              asChild
              className="bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600"
            >
              <Link href="/join">Join a workspace</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {query.data.items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.24) }}
              >
                <Link
                  href={`/dashboard/student/workspaces/${item.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-inkcuba-navy bg-white shadow-inkcuba transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-[2.2/1] w-full overflow-hidden">
                    {item.backgroundImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.backgroundImageUrl}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <WorkspaceDefaultBackground
                        compact
                        className="h-full w-full"
                      />
                    )}
                    <span className="absolute top-3 right-3 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-800 uppercase">
                      Active
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h2 className="font-heading text-base font-bold text-slate-900 group-hover:text-inkcuba-purple">
                      {item.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {item.className} · {item.semesterLabel}
                    </p>
                    <p className="mt-auto flex items-center gap-1.5 pt-1 text-xs font-medium text-slate-600">
                      <UserRound className="h-3.5 w-3.5 text-inkcuba-cyan" />
                      {item.lecturerName}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 sm:flex-row">
            <p>
              Showing {(query.data.page - 1) * query.data.pageSize + 1}–
              {Math.min(
                query.data.page * query.data.pageSize,
                query.data.total,
              )}{" "}
              of {query.data.total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-900"
                disabled={query.data.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <span className="text-xs font-semibold">
                Page {query.data.page} / {query.data.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-900"
                disabled={query.data.page >= query.data.totalPages}
                onClick={() =>
                  setPage((p) => Math.min(query.data!.totalPages, p + 1))
                }
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
