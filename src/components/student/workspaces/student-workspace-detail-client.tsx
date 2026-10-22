"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  FileUp,
  Info,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { WorkspaceDefaultBackground } from "@/components/lecturer/workspaces/workspace-form";
import { StudentWorkspacePeopleTab } from "@/components/student/workspaces/student-workspace-people-tab";
import { Button } from "@/components/ui/button";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getPublicProfileHref } from "@/lib/profiles/public-profile-path";
import { cn } from "@/lib/utils";
import type { StudentWorkspaceDetail } from "@/lib/workspaces/student-service";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

type TabId = "info" | "people" | "submission";

const TAB_IDS: TabId[] = ["info", "people", "submission"];

const TABS: { id: TabId; label: string; icon: typeof Info }[] = [
  { id: "info", label: "Info", icon: Info },
  { id: "people", label: "People", icon: Users },
  { id: "submission", label: "Submission", icon: FileUp },
];

function parseTabId(value: string | null | undefined): TabId {
  if (value && TAB_IDS.includes(value as TabId)) {
    return value as TabId;
  }
  return "info";
}

type StudentWorkspaceDetailClientProps = {
  workspaceId: string;
};

export function StudentWorkspaceDetailClient({
  workspaceId,
}: StudentWorkspaceDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTabId(searchParams.get("tab"));

  function setTab(next: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "info") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const query = useQuery({
    queryKey: ["student-workspace", workspaceId],
    queryFn: async () => {
      const response = await fetch(
        `/api/student/workspaces/${workspaceId}`,
      );
      const payload =
        (await response.json()) as ApiEnvelope<StudentWorkspaceDetail>;
      if (!payload.success) {
        throw new Error(payload.error?.message || "Failed to load workspace");
      }
      return payload.data;
    },
  });

  if (query.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <InkcubaLoader label="Loading workspace…" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="space-y-4 rounded-2xl border-2 border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">
          {query.error instanceof Error
            ? query.error.message
            : "Unable to open this workspace"}
        </p>
        <Button asChild variant="outline" className="border-slate-900">
          <Link href="/dashboard/student/workspaces">
            <ArrowLeft className="h-4 w-4" />
            Back to workspaces
          </Link>
        </Button>
      </div>
    );
  }

  const ws = query.data;
  const lecturerHref = getPublicProfileHref({
    id: ws.lecturer.id,
    nim: ws.lecturer.nim,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <Button asChild variant="outline" className="border-slate-900">
        <Link href="/dashboard/student/workspaces">
          <ArrowLeft className="h-4 w-4" />
          All workspaces
        </Link>
      </Button>

      <section className="overflow-hidden rounded-2xl border-2 border-inkcuba-navy bg-white shadow-inkcuba">
        <div className="relative h-32 w-full sm:h-40">
          {ws.backgroundImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ws.backgroundImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <WorkspaceDefaultBackground className="h-full w-full" />
          )}
        </div>
        <div className="space-y-1.5 border-t-2 border-inkcuba-navy px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-slate-600 uppercase">
              Workspace
            </span>
            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-800 uppercase">
              Active
            </span>
          </div>
          <h1 className="font-heading text-xl font-bold text-slate-900 sm:text-2xl">
            {ws.name}
          </h1>
          <p className="text-sm text-slate-600">
            {ws.className} · {ws.semesterLabel}
            {ws.memberCount > 0 ? ` · ${ws.memberCount} people` : ""}
          </p>
        </div>
      </section>

      <div
        role="tablist"
        aria-label="Workspace sections"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition",
                active
                  ? "border-inkcuba-navy bg-sky-50 text-slate-900 shadow-inkcuba"
                  : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {tab === "info" ? (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
            <aside className="h-fit rounded-2xl border-2 border-inkcuba-navy bg-white p-4 shadow-inkcuba">
              <h2 className="text-[11px] font-bold tracking-[0.14em] text-slate-500 uppercase">
                Lecturer
              </h2>
              <Link
                href={lecturerHref}
                className="group mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 transition hover:border-inkcuba-purple hover:bg-violet-50/50"
              >
                <UserAvatar
                  name={ws.lecturer.name}
                  image={ws.lecturer.image}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-inkcuba-purple">
                    {ws.lecturer.name}
                  </p>
                  {ws.lecturer.title ? (
                    <p className="truncate text-xs text-slate-500">
                      {ws.lecturer.title}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">View public profile</p>
                  )}
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-inkcuba-purple" />
              </Link>
              <dl className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                <CompactField
                  label="Campus"
                  value={ws.lecturer.campusLabel ?? ws.lecturer.campus}
                />
                <CompactField
                  label="Major"
                  value={ws.lecturer.majorLabel ?? ws.lecturer.major}
                />
                <CompactField
                  label="Department"
                  value={
                    ws.lecturer.departmentLabel ?? ws.lecturer.department
                  }
                />
              </dl>
            </aside>

            <section className="rounded-2xl border-2 border-inkcuba-navy bg-white p-4 shadow-inkcuba sm:p-5">
              <h2 className="font-heading text-lg font-bold text-slate-900">
                Workspace details
              </h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoField label="Name" value={ws.name} />
                <InfoField label="Class" value={ws.className} />
                <InfoField label="Semester" value={ws.semesterLabel} />
                <InfoField label="Status" value="Active" />
              </dl>
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-[11px] font-bold tracking-[0.12em] text-slate-500 uppercase">
                  Description
                </p>
                {ws.description ? (
                  <div
                    className="inkcuba-rich-text-content mt-2 text-sm leading-relaxed text-slate-700"
                    dangerouslySetInnerHTML={{ __html: ws.description }}
                  />
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    No description has been published for this workspace yet.
                  </p>
                )}
              </div>
            </section>
          </div>
        ) : null}

        {tab === "people" ? (
          <StudentWorkspacePeopleTab
            workspaceId={workspaceId}
            lecturer={ws.lecturer}
          />
        ) : null}

        {tab === "submission" ? (
          <div className="rounded-2xl border-2 border-dashed border-inkcuba-navy bg-gradient-to-br from-amber-50 via-white to-sky-50 p-6 shadow-inkcuba sm:p-8">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-inkcuba-orange" />
              <div>
                <p className="text-xs font-bold tracking-[0.14em] text-inkcuba-orange uppercase">
                  Coming soon
                </p>
                <h2 className="mt-1 font-heading text-xl font-bold text-slate-900">
                  Submission
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Soon you’ll submit portfolios and projects here when your
                  lecturer opens a submission slot. Check back after the next
                  workspace phase goes live.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

function CompactField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <dt className="shrink-0 font-bold tracking-wide text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="min-w-0 text-right font-medium break-words text-slate-900">
        {value?.trim() ? value : "—"}
      </dd>
    </div>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold tracking-[0.12em] text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium break-words text-slate-900">
        {value?.trim() ? value : "—"}
      </dd>
    </div>
  );
}
