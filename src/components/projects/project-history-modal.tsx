"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import { readApiJson } from "@/lib/api/read-response";

type HistoryEvent = {
  id: string;
  message: string;
  actorName: string | null;
  actorRole: string;
  createdAt: string;
  grade: number | null;
  feedback: string | null;
  metadata?: Record<string, unknown> | null;
};

type HistoryPage = {
  items: HistoryEvent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
};

export function ProjectHistoryButton({
  href,
  queryKey,
  label = "History",
  className,
  size = "default",
}: {
  href: string;
  queryKey: unknown[];
  label?: string;
  className?: string;
  size?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        className={className ?? "border-slate-900"}
        onClick={() => setOpen(true)}
      >
        <History className="h-4 w-4" />
        {label}
      </Button>
      <ProjectHistoryModal
        open={open}
        onOpenChange={setOpen}
        href={href}
        queryKey={queryKey}
      />
    </>
  );
}

export function ProjectHistoryModal({
  open,
  onOpenChange,
  href,
  queryKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  href: string;
  queryKey: unknown[];
}) {
  const query = useInfiniteQuery({
    queryKey: [...queryKey, "history-modal"],
    enabled: open,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const search = new URLSearchParams({
        page: String(pageParam),
        pageSize: "20",
      });
      const response = await fetch(`${href}?${search}`);
      return readApiJson<HistoryPage>(response, "Unable to load project history");
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data?.pages],
  );
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden border-2 border-slate-900 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-slate-100 px-5 py-4 text-left">
          <DialogTitle className="font-heading text-xl font-bold text-slate-900">
            Project history
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            Timeline of submit, moderation, revision, and publish steps.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {query.isLoading ? (
            <div className="flex min-h-[28vh] items-center justify-center">
              <InkcubaLoader label="Loading history…" />
            </div>
          ) : query.isError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {query.error instanceof Error ? query.error.message : "Unable to load history"}
            </p>
          ) : items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
              No history yet. Events appear after submit and moderation.
            </p>
          ) : (
            <ol className="space-y-3">
              {items.map((event) => (
                <li key={event.id} className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3">
                  <p className="text-sm font-medium text-slate-900">{event.message}</p>
                  <div className="mt-2 flex flex-col gap-0.5 text-xs text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
                    <span className="font-medium text-slate-700">
                      {event.actorName || event.actorRole}
                    </span>
                    <time dateTime={event.createdAt}>{formatWhen(event.createdAt)}</time>
                  </div>
                  {event.grade != null ? (
                    <p className="mt-2 text-xs font-semibold text-slate-700">Score {event.grade}</p>
                  ) : null}
                  <HistoryMetadata meta={event.metadata} />
                  {event.feedback ? (
                    <div
                      className="inkcuba-rich-text-content mt-2 text-xs text-slate-600"
                      dangerouslySetInnerHTML={{ __html: event.feedback }}
                    />
                  ) : null}
                </li>
              ))}
            </ol>
          )}
          {total > items.length ? (
            <p className="mt-3 text-center text-xs text-slate-500">
              Showing {items.length} of {total}
            </p>
          ) : null}
        </div>

        {query.hasNextPage ? (
          <div className="border-t border-slate-100 px-5 py-3">
            <Button
              type="button"
              variant="outline"
              className="w-full border-slate-900"
              disabled={query.isFetchingNextPage}
              onClick={() => query.fetchNextPage()}
            >
              {query.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Load older events
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function HistoryMetadata({ meta }: { meta?: Record<string, unknown> | null }) {
  if (!meta || typeof meta !== "object") return null;
  const scoringMode = typeof meta.scoringMode === "string" ? meta.scoringMode : null;
  const groupTotal = typeof meta.groupTotal === "number" ? meta.groupTotal : null;
  const maxScore = typeof meta.maxScore === "number" ? meta.maxScore : null;
  const groupPercent = typeof meta.groupPercent === "number" ? meta.groupPercent : null;
  const individualPercent =
    typeof meta.individualPercent === "number" ? meta.individualPercent : null;
  const revisionRound = typeof meta.revisionRound === "number" ? meta.revisionRound : null;
  const maxRevisions = typeof meta.maxRevisions === "number" ? meta.maxRevisions : null;
  const components = Array.isArray(meta.components) ? meta.components : [];
  const members = Array.isArray(meta.members) ? meta.members : [];

  const hasPublishDetail =
    scoringMode || groupTotal != null || components.length > 0 || members.length > 0;
  const hasRevisionDetail = revisionRound != null;

  if (!hasPublishDetail && !hasRevisionDetail) return null;

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600">
      {hasRevisionDetail ? (
        <p>
          Revision round {revisionRound}
          {maxRevisions != null ? ` of ${maxRevisions}` : ""}. Feedback only — no scores recorded.
        </p>
      ) : null}
      {scoringMode ? (
        <p className="font-medium text-slate-800">
          Mode: {scoringMode.replaceAll("_", " ").toLowerCase()}
          {groupPercent != null && individualPercent != null
            ? ` · ${groupPercent}% group / ${individualPercent}% individual`
            : ""}
        </p>
      ) : null}
      {groupTotal != null && maxScore != null ? (
        <p>
          Group total {groupTotal}/{maxScore}
        </p>
      ) : null}
      {components.length > 0 ? (
        <ul className="max-h-28 space-y-1 overflow-y-auto overscroll-contain border-t border-slate-100 pt-1">
          {components.map((row, index) => {
            const item = row as {
              name?: string;
              score?: number;
              maxPoints?: number;
              weightPercent?: number;
            };
            return (
              <li key={`${item.name ?? "c"}-${index}`} className="flex justify-between gap-2">
                <span className="min-w-0 truncate">{item.name ?? "Component"}</span>
                <span className="shrink-0 font-semibold text-slate-800">
                  {item.score ?? "—"}
                  {item.maxPoints != null ? `/${item.maxPoints}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {members.length > 0 ? (
        <ul className="max-h-28 space-y-1 overflow-y-auto overscroll-contain border-t border-slate-100 pt-1">
          {members.map((row, index) => {
            const item = row as {
              userId?: string;
              name?: string;
              finalGrade?: number;
              individualScore?: number | null;
            };
            return (
              <li key={`${item.userId ?? index}`} className="flex justify-between gap-2">
                <span className="min-w-0 truncate">
                  {item.name?.trim() || `Member ${index + 1}`}
                </span>
                <span className="shrink-0 font-semibold text-slate-800">
                  Final {item.finalGrade ?? "—"}
                  {item.individualScore != null ? ` · ind ${item.individualScore}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
