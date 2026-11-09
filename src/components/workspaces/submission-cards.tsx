"use client";

import { ArrowLeft, CalendarRange, ChevronRight, Hash, Users } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  formatSubmissionSchedule,
  formatSubmissionWhen,
  submissionExcerpt,
  submissionStatusClass,
  submissionStatusLabel,
  submissionTypeLabel,
} from "@/components/workspaces/submission-format";
import { plainTextFromHtml } from "@/lib/settings/plain-text";
import { cn } from "@/lib/utils";
import type { SubmissionRecord } from "@/lib/workspaces/submissions/types";

const DESCRIPTION_PREVIEW_CHARS = 280;

export function SubmissionBackLink({
  onClick,
  label = "Back to all submissions",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-950"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}

export function SubmissionListCard({
  item,
  onOpen,
}: {
  item: SubmissionRecord;
  onOpen: () => void;
}) {
  const excerpt = submissionExcerpt(item.description, 160);
  const isGroup = item.type === "GROUP" && item.maxGroupSize;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full cursor-pointer flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-200 hover:border-sky-400 hover:shadow-md focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none sm:flex-row sm:items-center sm:gap-6"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={submissionStatusClass(item.status)}>
            {submissionStatusLabel(item.status)}
          </Badge>
          <Badge>{submissionTypeLabel(item.type)}</Badge>
        </div>
        <h3 className="mt-2 truncate font-heading text-base font-bold text-slate-900">
          {item.title}
        </h3>
        {excerpt ? (
          <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-slate-600">{excerpt}</p>
        ) : null}
      </div>
      <dl
        className={cn(
          "grid w-full shrink-0 gap-2 sm:w-auto",
          isGroup ? "grid-cols-1 min-[480px]:grid-cols-3" : "grid-cols-1 min-[480px]:grid-cols-2",
        )}
      >
        <Fact
          icon={<CalendarRange className="h-3.5 w-3.5" />}
          label="Schedule"
          value={formatSubmissionSchedule(item)}
        />
        <Fact
          icon={<Hash className="h-3.5 w-3.5" />}
          label="Maximum score"
          value={String(item.maxScore)}
        />
        {isGroup ? (
          <Fact
            icon={<Users className="h-3.5 w-3.5" />}
            label="Group size"
            value={`Up to ${item.maxGroupSize}`}
          />
        ) : null}
      </dl>
      <ChevronRight className="hidden h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-sky-600 sm:block" />
    </button>
  );
}

export function SubmissionDetailCard({
  item,
  actions,
  emphasis = "quiet",
  afterMeta,
}: {
  item: SubmissionRecord;
  actions?: ReactNode;
  emphasis?: "quiet" | "panel";
  afterMeta?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl bg-white",
        emphasis === "quiet"
          ? "border border-slate-200 shadow-sm"
          : "border-2 border-inkcuba-navy shadow-inkcuba",
      )}
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className={submissionStatusClass(item.status)}>
              {submissionStatusLabel(item.status)}
            </Badge>
            <Badge>{submissionTypeLabel(item.type)}</Badge>
            {item.type === "GROUP" && item.groupMethod ? (
              <Badge>
                {item.groupMethod === "RANDOM" ? "Random groups" : "Student choice"}
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-2 font-heading text-xl font-bold text-slate-900 sm:text-2xl">
            {item.title}
          </h2>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x sm:divide-slate-100">
        <Meta
          label="Schedule"
          value={
            item.scheduleMode === "OPEN"
              ? "Open anytime"
              : `${formatSubmissionWhen(item.opensAt)} to ${formatSubmissionWhen(item.closesAt)}`
          }
        />
        <Meta label="Maximum score" value={String(item.maxScore)} />
        <Meta
          label="Type"
          value={
            item.type === "GROUP"
              ? `Group, up to ${item.maxGroupSize ?? "not set"} members`
              : "Individual"
          }
        />
      </dl>
      {afterMeta ? <div className="border-t border-slate-100 px-4 py-4 sm:px-5">{afterMeta}</div> : null}
      <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
        <p className="text-[11px] font-bold tracking-[0.12em] text-slate-500 uppercase">
          Description
        </p>
        {item.description ? (
          <DescriptionBody key={item.id} html={item.description} />
        ) : (
          <p className="mt-2 text-sm text-slate-500">No description for this submission.</p>
        )}
      </div>
    </section>
  );
}

function DescriptionBody({ html }: { html: string }) {
  const plainLength = plainTextFromHtml(html).length;
  const long = plainLength > DESCRIPTION_PREVIEW_CHARS;
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <div
        className={cn(
          "relative",
          long && !open && "max-h-36 overflow-hidden",
        )}
      >
        <div
          className="inkcuba-rich-text-content text-sm leading-relaxed text-slate-700"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {long && !open ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
        ) : null}
      </div>
      {long ? (
        <button
          type="button"
          className="mt-2 cursor-pointer text-sm font-semibold text-sky-700 hover:text-sky-900"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Show less" : "Show full description"}
        </button>
      ) : null}
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[9.5rem] rounded-xl bg-slate-50 px-3 py-2">
      <dt className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-slate-500 uppercase">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-xs font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function Badge({
  children,
  className = "border-slate-300 bg-slate-50 text-slate-700",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${className}`}
    >
      {children}
    </span>
  );
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="px-4 py-3 sm:px-5">
      <dt className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}
