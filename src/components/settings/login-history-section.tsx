"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  ShieldAlert,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { SettingsSectionCard } from "@/components/settings/settings-section-card";
import { Button } from "@/components/ui/button";
import { formatIpAddressForDisplay } from "@/lib/auth/format-ip";
import type { LoginHistoryEntry, LoginHistoryPage } from "@/lib/auth/login-history-types";
import { cn } from "@/lib/utils";

type LoginHistoryResponse = LoginHistoryPage;

function DeviceIcon({
  type,
}: {
  type: LoginHistoryEntry["device"]["deviceType"];
}) {
  const className = "h-5 w-5 text-sky-600";
  if (type === "mobile") return <Smartphone className={className} />;
  if (type === "tablet") return <Tablet className={className} />;
  return <Monitor className={className} />;
}

function formatWhen(iso: string): { relative: string; absolute: string } {
  const date = new Date(iso);
  const absolute = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  let relative = "Just now";
  if (minutes >= 1 && minutes < 60) relative = `${minutes}m ago`;
  else if (hours >= 1 && hours < 24) relative = `${hours}h ago`;
  else if (days >= 1) relative = `${days}d ago`;

  return { relative, absolute };
}

export function LoginHistorySection() {
  const [data, setData] = useState<LoginHistoryResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/settings/login-history?page=${nextPage}&pageSize=5`,
      );
      const payload = (await response.json()) as {
        success: boolean;
        data?: LoginHistoryResponse;
        error?: { message: string };
      };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? "Failed to load login history");
      }

      setData(payload.data);
      setPage(payload.data.page);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load login history";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <SettingsSectionCard
      title="Login History"
      description="Sign-ins from the last 7 days across your devices. Use this to spot unfamiliar activity."
      delay={0.25}
    >
      <div className="mb-4 flex flex-wrap items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/80 px-3 py-2.5 text-xs text-sky-900 sm:text-sm">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <p>
          Only the last 7 days are shown. If you see a device you do not
          recognize, change your password immediately.
        </p>
      </div>

      {loading && !data ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
          <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
          <p className="text-sm text-slate-500">Loading login history…</p>
        </div>
      ) : null}

      {error && !data ? (
        <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-red-100 bg-red-50 p-4 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-slate-900"
            onClick={() => void load(page)}
          >
            Try again
          </Button>
        </div>
      ) : null}

      {data && data.items.length === 0 ? (
        <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <History className="h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-700">No recent sign-ins</p>
          <p className="max-w-sm text-xs text-slate-500">
            New logins from the last {data.retentionDays} days will appear here.
          </p>
        </div>
      ) : null}

      {data && data.items.length > 0 ? (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {data.items.map((item) => {
              const when = formatWhen(item.createdAt);
              const location = formatIpAddressForDisplay(item.ipAddress);

              return (
                <motion.article
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex gap-3 rounded-xl border-2 bg-white p-3 sm:p-3.5",
                    item.isCurrent
                      ? "border-inkcuba-cyan bg-sky-50/50"
                      : "border-slate-200",
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-inkcuba-navy bg-gradient-to-br from-sky-50 to-violet-50">
                    <DeviceIcon type={item.device.deviceType} />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <h3 className="min-w-0 max-w-full truncate text-sm font-semibold text-slate-900">
                        {item.device.label}
                      </h3>
                      {item.isCurrent ? (
                        <span className="rounded-full bg-inkcuba-cyan px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                          This device
                        </span>
                      ) : null}
                      {item.isActive && !item.isCurrent ? (
                        <span className="rounded-full bg-inkcuba-lime/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700 uppercase">
                          Active
                        </span>
                      ) : null}
                      {!item.isActive ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                          Ended
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs break-words text-slate-600">
                      <span className="font-medium text-slate-800">
                        {when.relative}
                      </span>
                      <span className="text-slate-400"> · </span>
                      {when.absolute}
                    </p>
                    <p className="text-xs break-words text-slate-500 [overflow-wrap:anywhere]">
                      {location.label}
                      {location.detail ? (
                        <>
                          <span className="text-slate-300"> · </span>
                          <span className="font-mono text-[11px] text-slate-400">
                            {location.detail}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {(data.page - 1) * data.pageSize + 1}–
                {Math.min(data.page * data.pageSize, data.total)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">{data.total}</span>{" "}
              sign-ins (last {data.retentionDays} days)
            </p>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-900"
                disabled={loading || data.page <= 1}
                onClick={() => void load(data.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <span className="min-w-[4.5rem] text-center text-xs font-semibold text-slate-600">
                {data.page} / {data.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-900"
                disabled={loading || data.page >= data.totalPages}
                onClick={() => void load(data.page + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </SettingsSectionCard>
  );
}
