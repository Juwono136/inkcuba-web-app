"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Sparkles } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatSubmissionWhen } from "@/components/workspaces/submission-format";
import {
  SubmissionBackLink,
  SubmissionDetailCard,
  SubmissionListCard,
} from "@/components/workspaces/submission-cards";
import { SubmissionGroupBoard } from "@/components/workspaces/submission-group-board";
import { SubmissionPager } from "@/components/workspaces/submission-pager";
import { SubmissionToolbar } from "@/components/workspaces/submission-toolbar";
import { readApiJson } from "@/lib/api/read-response";
import type {
  SubmissionListPage,
  SubmissionPrepareState,
  SubmissionRecord,
  SubmissionSortField,
} from "@/lib/workspaces/submissions/types";

type StudentSubmissionTabProps = {
  workspaceId: string;
};

function readPayload<T>(response: Response, fallback: string): Promise<T> {
  return readApiJson<T>(response, fallback);
}

export function StudentSubmissionTab({ workspaceId }: StudentSubmissionTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const submissionId = searchParams.get("submission");
  const view = searchParams.get("view");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [sortBy, setSortBy] = useState<SubmissionSortField>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [q]);

  function navigate(id: string | null, nextView?: "groups" | "prepare") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "submission");
    if (id) params.set("submission", id);
    else params.delete("submission");
    if (nextView) params.set("view", nextView);
    else params.delete("view");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const listQuery = useQuery({
    queryKey: ["student-submissions", workspaceId, page, pageSize, debouncedQ, status, type, sortBy, sortDir],
    queryFn: async () => {
      const search = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        q: debouncedQ,
        status,
        type,
        sortBy,
        sortDir,
      });
      const response = await fetch(
        `/api/student/workspaces/${workspaceId}/submissions?${search}`,
      );
      return readPayload<SubmissionListPage>(response, "Failed to load submissions");
    },
    enabled: !submissionId,
  });

  const detailQuery = useQuery({
    queryKey: ["student-submission", workspaceId, submissionId],
    enabled: Boolean(submissionId),
    queryFn: async () => {
      const response = await fetch(
        `/api/student/workspaces/${workspaceId}/submissions/${submissionId}`,
      );
      return readPayload<{
        submission: SubmissionRecord;
        prepare: SubmissionPrepareState;
        viewerUserId: string;
      }>(response, "Failed to load submission");
    },
  });

  if (submissionId && view === "prepare") {
    const item = detailQuery.data?.submission;
    const prepare = detailQuery.data?.prepare;
    return (
      <div className="space-y-4">
        <SubmissionBackLink
          label={item?.type === "GROUP" ? "Back to groups" : "Back to all submissions"}
          onClick={() =>
            navigate(submissionId, item?.type === "GROUP" ? "groups" : undefined)
          }
        />
        {detailQuery.isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <InkcubaLoader label="Loading project…" />
          </div>
        ) : detailQuery.isError || !item || !prepare ? (
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {detailQuery.error instanceof Error
              ? detailQuery.error.message
              : "Unable to open this project"}
          </div>
        ) : !prepare.canPrepare ? (
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            {prepare.blockedReason}
          </div>
        ) : (
          <PreparePanel item={item} prepare={prepare} />
        )}
      </div>
    );
  }

  if (submissionId) {
    const item = detailQuery.data?.submission;
    const prepare = detailQuery.data?.prepare;
    return (
      <div className="space-y-4">
        <SubmissionBackLink onClick={() => navigate(null)} />
        {detailQuery.isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <InkcubaLoader label="Loading submission…" />
          </div>
        ) : detailQuery.isError || !item || !prepare ? (
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {detailQuery.error instanceof Error
              ? detailQuery.error.message
              : "Unable to open this submission"}
          </div>
        ) : (
          <>
            <SubmissionDetailCard item={item} />
            {item.type === "GROUP" ? (
              <SubmissionGroupBoard
                workspaceId={workspaceId}
                submissionId={item.id}
                mode="student"
                status={item.status}
                viewerUserId={detailQuery.data?.viewerUserId}
                prepareGroupId={prepare.myGroup?.id ?? null}
                onPrepareProject={() => {
                  void queryClient.invalidateQueries({
                    queryKey: ["student-submission", workspaceId, submissionId],
                  });
                  navigate(item.id, "prepare");
                }}
              />
            ) : (
              <PrepareProjectBanner
                prepare={prepare}
                onOpen={() => navigate(item.id, "prepare")}
              />
            )}
          </>
        )}
      </div>
    );
  }

  const pageData = listQuery.data;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-bold text-slate-900">Submissions</h2>
        <p className="mt-1 text-sm text-slate-600">
          Join a group when required, then prepare your project. Submit is coming soon.
        </p>
      </div>
      <SubmissionToolbar
        q={q}
        onQChange={setQ}
        status={status}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        statusOptions={[
          { value: "ALL", label: "All statuses" },
          { value: "ACTIVE", label: "Active" },
          { value: "CLOSED", label: "Closed" },
        ]}
        type={type}
        onTypeChange={(value) => {
          setType(value);
          setPage(1);
        }}
        sortBy={sortBy}
        onSortByChange={(value) => {
          setSortBy(value);
          setPage(1);
        }}
        sortDir={sortDir}
        onSortDirChange={(value) => {
          setSortDir(value);
          setPage(1);
        }}
        hasFilters={Boolean(debouncedQ) || status !== "ALL" || type !== "ALL"}
        activeFilterCount={
          (debouncedQ ? 1 : 0) + (status !== "ALL" ? 1 : 0) + (type !== "ALL" ? 1 : 0)
        }
        onClear={() => {
          setQ("");
          setDebouncedQ("");
          setStatus("ALL");
          setType("ALL");
          setPage(1);
        }}
      />
      {listQuery.isLoading ? (
        <div className="flex min-h-[220px] items-center justify-center">
          <InkcubaLoader label="Loading submissions…" />
        </div>
      ) : listQuery.isError ? (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {listQuery.error instanceof Error
            ? listQuery.error.message
            : "Unable to load submissions"}
        </div>
      ) : pageData && pageData.items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-inkcuba-navy bg-white px-6 py-14 text-center">
          <p className="font-heading font-bold text-slate-900">No submissions yet</p>
          <p className="mt-1 text-sm text-slate-600">
            Your lecturer has not published a submission for this class.
          </p>
        </div>
      ) : pageData ? (
        <>
          <div className="space-y-3">
            {pageData.items.map((item) => (
              <SubmissionListCard
                key={item.id}
                item={item}
                onOpen={() =>
                  navigate(item.id, item.type === "GROUP" ? "groups" : "prepare")
                }
              />
            ))}
          </div>
          <SubmissionPager
            page={pageData.page}
            pageSize={pageData.pageSize}
            total={pageData.total}
            totalPages={pageData.totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
      ) : null}
    </div>
  );
}

function PrepareProjectBanner({
  prepare,
  onOpen,
}: {
  prepare: SubmissionPrepareState;
  onOpen: () => void;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border-2 border-inkcuba-navy bg-gradient-to-r from-sky-50 via-white to-white p-4 shadow-inkcuba sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-[0.14em] text-sky-700 uppercase">
          Next step
        </p>
        <h2 className="font-heading mt-1 text-lg font-bold text-slate-900 sm:text-xl">
          Prepare project
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
          {prepare.canPrepare
            ? "Open the project page for this submission. Submit stays closed until that feature is ready."
            : prepare.blockedReason}
        </p>
      </div>
      <Button
        type="button"
        className="h-11 w-full shrink-0 bg-inkcuba-cyan px-5 text-base font-semibold hover:bg-sky-600 sm:w-auto"
        disabled={!prepare.canPrepare}
        onClick={onOpen}
      >
        Prepare project
        <ArrowRight className="h-4 w-4" />
      </Button>
    </section>
  );
}

function PreparePanel({
  item,
  prepare,
}: {
  item: SubmissionRecord;
  prepare: SubmissionPrepareState;
}) {
  return (
    <div className="space-y-4">
      <SubmissionDetailCard item={item} />
      {item.windowState === "UPCOMING" ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Opens {formatSubmissionWhen(item.opensAt)}.
        </p>
      ) : null}
      {item.windowState === "ENDED" ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Closed {formatSubmissionWhen(item.closesAt)}.
        </p>
      ) : null}
      {prepare.myGroup ? (
        <section className="rounded-2xl border-2 border-inkcuba-navy bg-white p-4 shadow-inkcuba sm:p-5">
          <p className="font-heading text-sm font-bold text-slate-900">{prepare.myGroup.name}</p>
          <p className="mt-1 text-xs text-slate-500">
            {prepare.myGroup.memberCount} members
          </p>
          <ul className="mt-3 space-y-2">
            {prepare.myGroup.members.map((member) => (
              <li key={member.userId} className="flex items-center gap-2">
                <UserAvatar name={member.name} image={member.image} size="sm" />
                <span className="text-sm text-slate-800">{member.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="rounded-2xl border-2 border-dashed border-inkcuba-navy bg-gradient-to-br from-amber-50 via-white to-sky-50 p-6 shadow-inkcuba">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-inkcuba-orange" />
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-inkcuba-orange uppercase">
              Coming soon
            </p>
            <h2 className="mt-1 font-heading text-xl font-bold text-slate-900">
              Prepare project
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Portfolio and project submit will open here. You can review the slot
              and your group now.
            </p>
            <p className="mt-3 text-sm font-medium text-slate-800">
              {prepare.blockedReason}
            </p>
            <Button type="button" className="mt-4" disabled>
              Submit project
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
