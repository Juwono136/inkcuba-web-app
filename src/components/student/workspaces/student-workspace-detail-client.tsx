"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, UserRound } from "lucide-react";
import Link from "next/link";

import { WorkspaceDefaultBackground } from "@/components/lecturer/workspaces/workspace-form";
import { Button } from "@/components/ui/button";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { StudentWorkspaceDetail } from "@/lib/workspaces/student-service";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

type StudentWorkspaceDetailClientProps = {
  workspaceId: string;
};

export function StudentWorkspaceDetailClient({
  workspaceId,
}: StudentWorkspaceDetailClientProps) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
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
        <div className="relative h-40 w-full sm:h-52">
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
        <div className="space-y-2 border-t-2 border-inkcuba-navy p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-slate-900">
              {ws.name}
            </h1>
            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-800 uppercase">
              Active
            </span>
          </div>
          <p className="text-sm text-slate-600">
            {ws.className} · {ws.semesterLabel}
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border-2 border-inkcuba-navy bg-white p-5 shadow-inkcuba sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-inkcuba-cyan" />
            <h2 className="font-heading text-lg font-bold text-slate-900">
              About this workspace
            </h2>
          </div>
          {ws.description ? (
            <div
              className="inkcuba-rich-text-content prose prose-sm max-w-none text-slate-700"
              dangerouslySetInnerHTML={{ __html: ws.description }}
            />
          ) : (
            <p className="text-sm text-slate-500">
              No description has been published for this workspace yet.
            </p>
          )}
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            Submissions and scoring tools for students are coming soon. Check
            back here when your lecturer opens the next phase.
          </div>
        </section>

        <section className="rounded-2xl border-2 border-inkcuba-navy bg-white p-5 shadow-inkcuba sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <UserRound className="h-4 w-4 text-inkcuba-purple" />
            <h2 className="font-heading text-lg font-bold text-slate-900">
              Lecturer
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <UserAvatar
              name={ws.lecturer.name}
              image={ws.lecturer.image}
              size="lg"
            />
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">
                {ws.lecturer.name}
              </p>
              {ws.lecturer.title ? (
                <p className="truncate text-xs text-slate-500">
                  {ws.lecturer.title}
                </p>
              ) : null}
              <p className="truncate text-xs text-slate-500">
                {ws.lecturer.email}
              </p>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
