import { plainTextFromHtml } from "@/lib/settings/plain-text";
import type { SubmissionRecord } from "@/lib/workspaces/submissions/types";
import {
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_TYPE_LABELS,
} from "@/lib/workspaces/submissions/types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatSubmissionWhen(value: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatSubmissionSchedule(
  item: Pick<SubmissionRecord, "scheduleMode" | "opensAt" | "closesAt">,
): string {
  if (item.scheduleMode === "OPEN") return "Open anytime";
  return `${formatSubmissionWhen(item.opensAt)} to ${formatSubmissionWhen(item.closesAt)}`;
}

export function submissionExcerpt(html: string | null, max = 160): string {
  const plain = plainTextFromHtml(html ?? "");
  if (!plain) return "";
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).trimEnd()}…`;
}

export function submissionStatusClass(status: SubmissionRecord["status"]): string {
  if (status === "ACTIVE") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (status === "DRAFT") return "border-amber-300 bg-amber-50 text-amber-900";
  return "border-slate-300 bg-slate-100 text-slate-600";
}

export function submissionTypeLabel(type: SubmissionRecord["type"]): string {
  return SUBMISSION_TYPE_LABELS[type];
}

export function submissionStatusLabel(status: SubmissionRecord["status"]): string {
  return SUBMISSION_STATUS_LABELS[status];
}

export function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
