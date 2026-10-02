"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Link2,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { WorkspaceDefaultBackground } from "@/components/lecturer/workspaces/workspace-form";
import { Button } from "@/components/ui/button";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StudentWorkspaceListPage } from "@/lib/workspaces/student-service";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

async function fetchStudentWorkspaces(params: {
  page: number;
  pageSize: number;
  q: string;
}): Promise<StudentWorkspaceListPage> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) search.set("q", params.q);

  const response = await fetch(`/api/student/workspaces?${search}`);
  const payload = (await response.json()) as ApiEnvelope<StudentWorkspaceListPage>;
  if (!payload.success) {
    throw new Error(payload.error?.message || "Failed to load workspaces");
  }
  return payload.data;
}

export function StudentWorkspacesListClient() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [q]);

  const query = useQuery({
    queryKey: ["student-workspaces", page, pageSize, debouncedQ],
    queryFn: () =>
      fetchStudentWorkspaces({ page, pageSize, q: debouncedQ }),
    placeholderData: (previous) => previous,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">
            My workspaces
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Class workspaces you joined via invite or lecturer enrollment.
          </p>
        </div>
        <Button asChild variant="outline" className="border-slate-900">
          <Link href="/join">
            <Link2 className="h-4 w-4" />
            Join with code
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, class, or lecturer…"
            className="rounded-xl border-2 border-slate-900 bg-white pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="whitespace-nowrap">Per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-[4.5rem] rounded-xl border-2 border-slate-900">
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
      </div>

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
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-inkcuba-navy bg-white px-6 py-14 text-center shadow-inkcuba">
          <FolderKanban className="h-10 w-10 text-inkcuba-purple" />
          <p className="max-w-sm text-sm text-slate-600">
            {debouncedQ
              ? "No workspaces match your search."
              : "No workspaces yet. Ask your lecturer for an invite link or code, then join to get started."}
          </p>
          {!debouncedQ ? (
            <Button asChild className="bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600">
              <Link href="/join">Join a workspace</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {query.data.items.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/student/workspaces/${item.id}`}
                className="group overflow-hidden rounded-2xl border-2 border-inkcuba-navy bg-white shadow-inkcuba transition hover:-translate-y-0.5"
              >
                <div className="relative aspect-[2/1] w-full overflow-hidden">
                  {item.backgroundImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.backgroundImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <WorkspaceDefaultBackground
                      compact
                      className="h-full w-full"
                    />
                  )}
                </div>
                <div className="space-y-1 p-4">
                  <h2 className="font-heading text-base font-bold text-slate-900 group-hover:text-inkcuba-purple">
                    {item.name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {item.className} · {item.semesterLabel}
                  </p>
                  <p className="text-xs text-slate-500">
                    Lecturer: {item.lecturerName}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600 sm:flex-row">
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
