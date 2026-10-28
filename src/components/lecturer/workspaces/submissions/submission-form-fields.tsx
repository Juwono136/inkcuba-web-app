"use client";

import { useMemo, useState } from "react";

import { WorkspaceRichTextEditor } from "@/components/lecturer/workspaces/workspace-rich-text-editor";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { plainTextFromHtml } from "@/lib/settings/plain-text";
import {
  SUBMISSION_DESCRIPTION_MAX_PLAIN,
  SUBMISSION_GROUP_SIZE_MAX,
  SUBMISSION_GROUP_SIZE_MIN,
  SUBMISSION_SCORE_MAX,
  SUBMISSION_SCORE_MIN,
  SUBMISSION_TITLE_MAX,
  SUBMISSION_TITLE_MIN,
} from "@/lib/workspaces/submissions/types";
import type { SubmissionRecord } from "@/lib/workspaces/submissions/types";
import {
  submissionWriteSchema,
  type SubmissionWriteInput,
} from "@/lib/workspaces/submissions/validators";

type SubmissionFormDialogProps = {
  mode: "create" | "edit";
  initial?: SubmissionRecord | null;
  submitting?: boolean;
  onSubmit: (input: SubmissionWriteInput) => Promise<void>;
  onCancel: () => void;
};

type FormState = {
  title: string;
  description: string;
  maxScore: string;
  scheduleMode: "OPEN" | "WINDOW";
  opensDate: string;
  opensTime: string;
  closesDate: string;
  closesTime: string;
  type: "INDIVIDUAL" | "GROUP";
  groupMethod: "RANDOM" | "SELF_SELECT";
  maxGroupSize: string;
  status: "DRAFT" | "ACTIVE";
};

function splitLocal(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function joinLocal(date: string, time: string): string | null {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function initialState(initial?: SubmissionRecord | null): FormState {
  const opens = splitLocal(initial?.opensAt ?? null);
  const closes = splitLocal(initial?.closesAt ?? null);
  return {
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    maxScore: initial ? String(initial.maxScore) : "100",
    scheduleMode: initial?.scheduleMode ?? "WINDOW",
    opensDate: opens.date,
    opensTime: opens.time,
    closesDate: closes.date,
    closesTime: closes.time,
    type: initial?.type ?? "INDIVIDUAL",
    groupMethod: initial?.groupMethod ?? "SELF_SELECT",
    maxGroupSize: initial?.maxGroupSize ? String(initial.maxGroupSize) : "4",
    status: initial?.status === "ACTIVE" ? "ACTIVE" : "DRAFT",
  };
}

export function SubmissionFormFields({
  mode,
  initial,
  submitting = false,
  onSubmit,
  onCancel,
}: SubmissionFormDialogProps) {
  const [values, setValues] = useState<FormState>(() => initialState(initial));
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<SubmissionWriteInput | null>(null);
  const plainLength = plainTextFromHtml(values.description).length;

  const payload = useMemo<SubmissionWriteInput>(
    () => ({
      title: values.title,
      description: values.description,
      maxScore: Number(values.maxScore),
      scheduleMode: values.scheduleMode,
      opensAt:
        values.scheduleMode === "WINDOW"
          ? joinLocal(values.opensDate, values.opensTime)
          : null,
      closesAt:
        values.scheduleMode === "WINDOW"
          ? joinLocal(values.closesDate, values.closesTime)
          : null,
      type: values.type,
      groupMethod: values.type === "GROUP" ? values.groupMethod : null,
      maxGroupSize: values.type === "GROUP" ? Number(values.maxGroupSize) : null,
      status: values.status,
    }),
    [values],
  );

  function requestSave() {
    const parsed = submissionWriteSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form and try again");
      return;
    }
    if (plainLength > SUBMISSION_DESCRIPTION_MAX_PLAIN) {
      setError(
        `Description must be at most ${SUBMISSION_DESCRIPTION_MAX_PLAIN} characters`,
      );
      return;
    }
    setError(null);
    setPending(parsed.data);
    setConfirmOpen(true);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="submission-title">Title</Label>
        <Input
          id="submission-title"
          value={values.title}
          placeholder="e.g. Midterm project"
          minLength={SUBMISSION_TITLE_MIN}
          maxLength={SUBMISSION_TITLE_MAX}
          disabled={submitting}
          className="h-10 rounded-xl border-2 border-slate-900"
          onChange={(event) =>
            setValues((prev) => ({ ...prev, title: event.target.value }))
          }
        />
      </div>

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
        <Label>Status</Label>
        <Segmented
          value={values.status}
          disabled={submitting}
          options={[
            { value: "DRAFT", label: "Draft" },
            { value: "ACTIVE", label: "Active" },
          ]}
          onChange={(value) => setValues((prev) => ({ ...prev, status: value }))}
        />
        <p className="text-xs leading-relaxed text-slate-600">
          {values.status === "ACTIVE"
            ? "Students can open this slot while the workspace is active."
            : "Only you can see a draft. Switch to Active when the class should start."}
        </p>
      </section>
      </div>

      <div className="space-y-5">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="submission-score">Maximum score</Label>
          <Input
            id="submission-score"
            inputMode="numeric"
            value={values.maxScore}
            placeholder={`${SUBMISSION_SCORE_MIN}–${SUBMISSION_SCORE_MAX}`}
            disabled={submitting}
            className="h-10 rounded-xl border-2 border-slate-900"
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                maxScore: event.target.value.replace(/[^\d]/g, ""),
              }))
            }
          />
          <p className="text-xs text-slate-500">Whole number from 1 to 1000.</p>
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Segmented
            value={values.type}
            disabled={submitting}
            options={[
              { value: "INDIVIDUAL", label: "Individual" },
              { value: "GROUP", label: "Group" },
            ]}
            onChange={(value) => setValues((prev) => ({ ...prev, type: value }))}
          />
        </div>
      </div>

      {values.type === "GROUP" ? (
        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
          <div className="space-y-2">
            <Label htmlFor="submission-size">Max members per group</Label>
            <Input
              id="submission-size"
              inputMode="numeric"
              value={values.maxGroupSize}
              placeholder={`${SUBMISSION_GROUP_SIZE_MIN}–${SUBMISSION_GROUP_SIZE_MAX}`}
              disabled={submitting}
              className="h-10 rounded-xl border-2 border-slate-900 bg-white"
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  maxGroupSize: event.target.value.replace(/[^\d]/g, ""),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>How groups are formed</Label>
            <Segmented
              value={values.groupMethod}
              disabled={submitting}
              options={[
                { value: "SELF_SELECT", label: "Students choose" },
                { value: "RANDOM", label: "Assign randomly" },
              ]}
              onChange={(value) =>
                setValues((prev) => ({ ...prev, groupMethod: value }))
              }
            />
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            Random assignment runs from the group board and replaces the current arrangement. Students can still move into a group that is not full.
          </p>
        </section>
      ) : (
        <p className="text-xs text-slate-500">
          Each student prepares their own project. Group work is not allowed.
        </p>
      )}
      </div>
      </div>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
        <div className="space-y-2">
          <Label>Schedule</Label>
          <Segmented
            value={values.scheduleMode}
            disabled={submitting}
            options={[
              { value: "WINDOW", label: "Date range" },
              { value: "OPEN", label: "No deadline" },
            ]}
            onChange={(value) =>
              setValues((prev) => ({ ...prev, scheduleMode: value }))
            }
          />
        </div>
        {values.scheduleMode === "WINDOW" ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <DateTimeFields
              label="Opens"
              date={values.opensDate}
              time={values.opensTime}
              disabled={submitting}
              onDate={(opensDate) => setValues((prev) => ({ ...prev, opensDate }))}
              onTime={(opensTime) => setValues((prev) => ({ ...prev, opensTime }))}
            />
            <DateTimeFields
              label="Closes"
              date={values.closesDate}
              time={values.closesTime}
              disabled={submitting}
              onDate={(closesDate) => setValues((prev) => ({ ...prev, closesDate }))}
              onTime={(closesTime) => setValues((prev) => ({ ...prev, closesTime }))}
            />
          </div>
        ) : (
          <p className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs leading-relaxed text-sky-900">
            Students can submit whenever this slot is active. There is no opening or closing time.
          </p>
        )}
      </section>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Description (optional)</Label>
          <span
            className={cn(
              "text-[11px]",
              plainLength > SUBMISSION_DESCRIPTION_MAX_PLAIN
                ? "font-semibold text-red-600"
                : "text-slate-500",
            )}
          >
            {plainLength}/{SUBMISSION_DESCRIPTION_MAX_PLAIN}
          </span>
        </div>
        <WorkspaceRichTextEditor
          value={values.description}
          onChange={(html) => setValues((prev) => ({ ...prev, description: html }))}
          disabled={submitting}
          allowImages={false}
          showCounter={false}
          maxPlainLength={SUBMISSION_DESCRIPTION_MAX_PLAIN}
          ariaLabel="Submission description"
          placeholder="What should students prepare?"
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="border-slate-900"
          disabled={submitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className="bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600"
          disabled={submitting}
          onClick={requestSave}
        >
          {mode === "create" ? "Create submission" : "Save changes"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={mode === "create" ? "Create this submission?" : "Save submission changes?"}
        description={
          values.status === "ACTIVE"
            ? "Students in an active workspace can see this slot as soon as you save."
            : "This slot stays hidden from students until you set the status to Active."
        }
        confirmLabel={
          mode === "create"
            ? values.status === "ACTIVE"
              ? "Create and publish"
              : "Create draft"
            : "Save changes"
        }
        loading={submitting}
        onConfirm={async () => {
          if (!pending) return;
          await onSubmit(pending);
        }}
      />
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 rounded-xl border-2 border-slate-900 bg-white p-1 min-[420px]:grid-cols-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "cursor-pointer rounded-lg px-2 py-2 text-center text-sm leading-tight font-semibold transition disabled:cursor-not-allowed",
            value === option.value
              ? "bg-inkcuba-navy text-white shadow-inkcuba"
              : "text-slate-600 hover:bg-slate-50",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function DateTimeFields({
  label,
  date,
  time,
  disabled,
  onDate,
  onTime,
}: {
  label: string;
  date: string;
  time: string;
  disabled?: boolean;
  onDate: (value: string) => void;
  onTime: (value: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">{label}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(12rem,1fr)_9rem]">
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Date</Label>
          <Input
            type="date"
            value={date}
            disabled={disabled}
            required
            className="h-11 w-full min-w-[12rem] rounded-xl border-2 border-slate-900 bg-white"
            onChange={(event) => onDate(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Time</Label>
          <Input
            type="time"
            value={time}
            disabled={disabled}
            required
            className="h-11 w-full min-w-[8.5rem] rounded-xl border-2 border-slate-900 bg-white"
            onChange={(event) => onTime(event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
