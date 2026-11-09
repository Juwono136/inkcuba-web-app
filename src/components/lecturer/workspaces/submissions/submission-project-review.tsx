"use client";

import { useQuery } from "@tanstack/react-query";

import { readApiJson } from "@/lib/api/read-response";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/projects/limits";

type ReviewList = {
  items: Array<{
    id: string;
    title: string;
    status: ProjectStatus;
    who: string;
    updatedAt: string;
  }>;
  note: string;
};

export function SubmissionProjectReview({
  workspaceId,
  submissionId,
}: {
  workspaceId: string;
  submissionId: string;
}) {
  const query = useQuery({
    queryKey: ["lecturer-submission-projects", workspaceId, submissionId],
    queryFn: async () => {
      const response = await fetch(
        `/api/lecturer/workspaces/${workspaceId}/submissions/${submissionId}/projects`,
      );
      return readApiJson<ReviewList>(response, "Unable to load student projects");
    },
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="font-heading text-lg font-bold text-slate-900">Student projects</h3>
      <p className="mt-1 text-sm text-slate-600">
        {query.data?.note ?? "Review and scoring will be added here. Status changes are not available yet."}
      </p>
      {query.isError ? (
        <p className="mt-3 text-sm text-red-700">
          {query.error instanceof Error ? query.error.message : "Unable to load student projects"}
        </p>
      ) : null}
      <ul className="mt-3 space-y-2">
        {(query.data?.items ?? []).map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <span>
              <span className="font-semibold text-slate-900">{item.title}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{item.who}</span>
            </span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold tracking-wide text-slate-700 uppercase">
              {PROJECT_STATUS_LABELS[item.status] ?? item.status}
            </span>
          </li>
        ))}
        {query.data && query.data.items.length === 0 ? (
          <li className="text-sm text-slate-500">No student projects on this submission yet.</li>
        ) : null}
      </ul>
    </section>
  );
}
