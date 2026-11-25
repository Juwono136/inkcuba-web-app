"use client";

import { AlertCircle, CheckCircle2, GripVertical, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { WorkspaceRichTextEditor } from "@/components/lecturer/workspaces/workspace-rich-text-editor";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { allocateComponentMaxPoints } from "@/lib/projects/rubric";
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

type RubricRowState = {
  key: string;
  id?: string;
  name: string;
  description: string;
  weightPercent: string;
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
  rubric: RubricRowState[];
};

type FormTab = "details" | "rubric";

type RubricRowErrors = { name?: string; weight?: string };

const RUBRIC_MAX_COMPONENTS = 20;
const RUBRIC_MIN_COMPONENTS = 1;
const RUBRIC_NAME_MIN = 2;
const RUBRIC_NAME_MAX = 120;

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

function defaultRubric(): RubricRowState[] {
  return [
    {
      key: crypto.randomUUID(),
      name: "",
      description: "",
      weightPercent: "100",
    },
  ];
}

function initialState(initial?: SubmissionRecord | null): FormState {
  const opens = splitLocal(initial?.opensAt ?? null);
  const closes = splitLocal(initial?.closesAt ?? null);
  const rubric =
    initial?.rubric && initial.rubric.length > 0
      ? initial.rubric.map((row) => ({
          key: row.id,
          id: row.id,
          name: row.name,
          description: row.description ?? "",
          weightPercent: String(row.weightPercent),
        }))
      : defaultRubric();
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
    rubric,
  };
}

function validateRubricRow(row: RubricRowState): RubricRowErrors {
  const errors: RubricRowErrors = {};
  const name = row.name.trim();
  if (name.length === 0) {
    errors.name = "Component name is required";
  } else if (name.length < RUBRIC_NAME_MIN) {
    errors.name = `Use at least ${RUBRIC_NAME_MIN} characters`;
  } else if (name.length > RUBRIC_NAME_MAX) {
    errors.name = `Use at most ${RUBRIC_NAME_MAX} characters`;
  }

  if (row.weightPercent.trim() === "") {
    errors.weight = "Weight is required";
  } else {
    const weight = Number(row.weightPercent);
    if (!Number.isInteger(weight)) {
      errors.weight = "Whole number only";
    } else if (weight < 1) {
      errors.weight = "Min 1%";
    } else if (weight > 100) {
      errors.weight = "Max 100%";
    }
  }
  return errors;
}

export function SubmissionFormFields({
  mode,
  initial,
  submitting = false,
  onSubmit,
  onCancel,
}: SubmissionFormDialogProps) {
  const [values, setValues] = useState<FormState>(() => initialState(initial));
  const [tab, setTab] = useState<FormTab>("details");
  const [error, setError] = useState<string | null>(null);
  const [errorTab, setErrorTab] = useState<FormTab | null>(null);
  const [showRubricErrors, setShowRubricErrors] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<SubmissionWriteInput | null>(null);
  const plainLength = plainTextFromHtml(values.description).length;

  const rubricLocked = Boolean(initial?.rubricLocked);
  const structureLocked = Boolean(initial?.structureLocked);
  const maxScoreNumber = Number(values.maxScore) || 0;
  const weightTotal = values.rubric.reduce(
    (sum, row) => sum + (Number(row.weightPercent) || 0),
    0,
  );
  const componentMaxes = allocateComponentMaxPoints(
    values.rubric.map((row) => Number(row.weightPercent) || 0),
    maxScoreNumber > 0 ? maxScoreNumber : 100,
  );

  const rowErrors = useMemo(
    () => values.rubric.map((row) => validateRubricRow(row)),
    [values.rubric],
  );
  const hasInvalidRow = rowErrors.some((row) => row.name || row.weight);
  const rubricInvalid = weightTotal !== 100 || hasInvalidRow;
  const weightDelta = 100 - weightTotal;

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
      rubric: values.rubric.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        weightPercent: Number(row.weightPercent) || 0,
      })),
    }),
    [values],
  );

  function fail(message: string, target: FormTab) {
    setError(message);
    setErrorTab(target);
    setTab(target);
  }

  function updateRow(key: string, patch: Partial<RubricRowState>) {
    setValues((prev) => ({
      ...prev,
      rubric: prev.rubric.map((item) =>
        item.key === key ? { ...item, ...patch } : item,
      ),
    }));
  }

  function markTouched(key: string, field: "name" | "weight") {
    setTouched((prev) => ({ ...prev, [`${key}:${field}`]: true }));
  }

  function requestSave() {
    // Always validate the whole form, regardless of the active tab.
    const rubricMessage = hasInvalidRow
      ? "Fix the highlighted rubric components before saving"
      : weightTotal !== 100
        ? `Rubric weights must total 100% (currently ${weightTotal}%)`
        : null;
    if (rubricMessage) setShowRubricErrors(true);

    const parsed = submissionWriteSchema.safeParse(payload);
    if (!parsed.success) {
      const rubricIssue = parsed.error.issues.find((issue) => issue.path[0] === "rubric");
      const detailsIssue = parsed.error.issues.find((issue) => issue.path[0] !== "rubric");
      if (rubricIssue) setShowRubricErrors(true);
      // Stay on the current tab when it has a problem; otherwise jump to the one that does.
      if (tab === "details" && detailsIssue) return fail(detailsIssue.message, "details");
      if (tab === "rubric" && rubricIssue) {
        return fail(rubricMessage ?? rubricIssue.message, "rubric");
      }
      if (rubricIssue) return fail(rubricMessage ?? rubricIssue.message, "rubric");
      return fail(detailsIssue?.message ?? "Check the form and try again", "details");
    }
    if (rubricMessage) {
      return fail(rubricMessage, "rubric");
    }
    if (plainLength > SUBMISSION_DESCRIPTION_MAX_PLAIN) {
      return fail(
        `Description must be at most ${SUBMISSION_DESCRIPTION_MAX_PLAIN} characters`,
        "details",
      );
    }
    setError(null);
    setErrorTab(null);
    setPending(parsed.data);
    setConfirmOpen(true);
  }

  const rubricBadge = rubricInvalid ? (
    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-900 uppercase">
      Required
    </span>
  ) : (
    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-emerald-800 uppercase">
      Ready
    </span>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Segmented<FormTab>
          value={tab}
          columns={2}
          ariaLabel="Submission form sections"
          options={[
            {
              value: "details",
              label: "Details",
              badge:
                errorTab === "details" && error ? (
                  <span
                    className="size-2 rounded-full bg-red-500"
                    aria-label="Has errors"
                  />
                ) : undefined,
            },
            {
              value: "rubric",
              label: "Assessment rubric",
              badge: rubricBadge,
            },
          ]}
          onChange={setTab}
        />
        <p className="text-xs leading-relaxed text-slate-600">
          Both tabs are required for a complete submission: fill in the details, then
          define an assessment rubric whose weights total 100%.
        </p>
      </div>

      {tab === "details" ? (
        <div className="space-y-5" role="tabpanel" aria-label="Details">
          <div className="grid gap-5 lg:grid-cols-2">
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
              <p className="text-xs text-slate-500">
                Whole number from {SUBMISSION_SCORE_MIN} to {SUBMISSION_SCORE_MAX}.
              </p>
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

            <section className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <Label>Type</Label>
              <Segmented
                value={values.type}
                disabled={submitting || structureLocked}
                options={[
                  { value: "INDIVIDUAL", label: "Individual" },
                  { value: "GROUP", label: "Group" },
                ]}
                onChange={(value) => setValues((prev) => ({ ...prev, type: value }))}
              />
              <p className="text-xs leading-relaxed text-slate-600">
                {structureLocked
                  ? "Type is locked because at least one project on this slot has already been submitted or reviewed."
                  : values.type === "GROUP"
                    ? "Students work in teams. Configure team size and formation below."
                    : "Each student prepares their own project. Group work is not allowed."}
              </p>
            </section>
          </div>

          {structureLocked ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
              Structure locked: individual/group type and how groups are formed cannot change after
              scoring has started. Group membership for projects in review or published stays locked
              until you request a revision.
            </p>
          ) : null}

          {values.type === "GROUP" ? (
            <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 sm:p-4">
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
                <p className="text-xs text-slate-500">
                  {SUBMISSION_GROUP_SIZE_MIN}–{SUBMISSION_GROUP_SIZE_MAX} members.
                </p>
              </div>
              <div className="space-y-2">
                <Label>How groups are formed</Label>
                <Segmented
                  value={values.groupMethod}
                  disabled={submitting || structureLocked}
                  options={[
                    { value: "SELF_SELECT", label: "Students choose" },
                    { value: "RANDOM", label: "Assign randomly" },
                  ]}
                  onChange={(value) =>
                    setValues((prev) => ({ ...prev, groupMethod: value }))
                  }
                />
              </div>
              <p className="text-xs leading-relaxed text-slate-600 sm:col-span-2">
                {structureLocked
                  ? "Formation method is locked. Use the group board to move members only for draft or revision groups."
                  : "Random assignment runs from the group board and replaces the current arrangement. Students can still move into a group that is not full."}
              </p>
            </section>
          ) : null}

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
        </div>
      ) : (
        <section
          className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4"
          role="tabpanel"
          aria-label="Assessment rubric"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Label>Assessment rubric</Label>
                <span className="rounded-full bg-inkcuba-navy px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                  Required
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                Weights must total exactly 100%. Max points per component are derived
                from the maximum score ({maxScoreNumber > 0 ? maxScoreNumber : 100} pts).
              </p>
            </div>
            <p
              role="status"
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
                weightTotal === 100
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-900",
              )}
            >
              {weightTotal === 100 ? (
                <CheckCircle2 className="size-3.5" aria-hidden />
              ) : (
                <AlertCircle className="size-3.5" aria-hidden />
              )}
              Total {weightTotal}%
            </p>
          </div>

          {rubricLocked ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Names and weights are locked after the first score sheet. You can still
              edit component descriptions.
            </p>
          ) : null}

          <div className="space-y-3">
            {values.rubric.map((row, index) => {
              const errors = rowErrors[index] ?? {};
              const nameError =
                errors.name && (showRubricErrors || touched[`${row.key}:name`])
                  ? errors.name
                  : null;
              const weightError =
                errors.weight && (showRubricErrors || touched[`${row.key}:weight`])
                  ? errors.weight
                  : null;
              return (
                <div
                  key={row.key}
                  className={cn(
                    "space-y-3 rounded-2xl border bg-white p-3 sm:p-4",
                    nameError || weightError ? "border-red-300" : "border-slate-200",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                      <GripVertical className="size-3.5" aria-hidden />
                      Component {index + 1}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-inkcuba-navy">
                        Max {componentMaxes[index] ?? 0} pts
                      </span>
                      {!rubricLocked ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Remove component ${index + 1}`}
                          title={
                            values.rubric.length <= RUBRIC_MIN_COMPONENTS
                              ? "At least one component is required"
                              : "Remove component"
                          }
                          className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={
                            submitting || values.rubric.length <= RUBRIC_MIN_COMPONENTS
                          }
                          onClick={() =>
                            setValues((prev) => ({
                              ...prev,
                              rubric: prev.rubric.filter((item) => item.key !== row.key),
                            }))
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Name</Label>
                      <Input
                        value={row.name}
                        disabled={submitting || rubricLocked}
                        placeholder="e.g. Design quality"
                        maxLength={RUBRIC_NAME_MAX}
                        aria-invalid={Boolean(nameError)}
                        className={cn(
                          "h-10 rounded-xl border-2 border-slate-900",
                          nameError && "border-red-500",
                        )}
                        onBlur={() => markTouched(row.key, "name")}
                        onChange={(event) => updateRow(row.key, { name: event.target.value })}
                      />
                      {nameError ? <FieldError message={nameError} /> : null}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Weight %</Label>
                      <Input
                        inputMode="numeric"
                        value={row.weightPercent}
                        disabled={submitting || rubricLocked}
                        placeholder="1–100"
                        aria-invalid={Boolean(weightError)}
                        className={cn(
                          "h-10 rounded-xl border-2 border-slate-900",
                          weightError && "border-red-500",
                        )}
                        onBlur={() => markTouched(row.key, "weight")}
                        onChange={(event) =>
                          updateRow(row.key, {
                            weightPercent: event.target.value.replace(/[^\d]/g, ""),
                          })
                        }
                      />
                      {weightError ? <FieldError message={weightError} /> : null}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Description</Label>
                    <Input
                      value={row.description}
                      disabled={submitting}
                      maxLength={500}
                      placeholder="What should be assessed?"
                      className="h-10 rounded-xl border-2 border-slate-900"
                      onChange={(event) =>
                        updateRow(row.key, { description: event.target.value })
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {weightTotal !== 100 ? (
            <p
              className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900"
              role="alert"
            >
              <AlertCircle className="size-3.5 shrink-0" aria-hidden />
              {weightDelta > 0
                ? `Weights total ${weightTotal}%. Allocate ${weightDelta}% more to reach 100%.`
                : `Weights total ${weightTotal}%. Reduce by ${-weightDelta}% to reach 100%.`}
            </p>
          ) : null}

          {!rubricLocked ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-900"
                disabled={submitting || values.rubric.length >= RUBRIC_MAX_COMPONENTS}
                onClick={() =>
                  setValues((prev) => ({
                    ...prev,
                    rubric: [
                      ...prev.rubric,
                      {
                        key: crypto.randomUUID(),
                        name: "",
                        description: "",
                        weightPercent: "",
                      },
                    ],
                  }))
                }
              >
                <Plus className="size-4" />
                Add component
              </Button>
              <span className="text-xs text-slate-500">
                {values.rubric.length}/{RUBRIC_MAX_COMPONENTS} components
              </span>
            </div>
          ) : null}
        </section>
      )}

      <div className="space-y-3 border-t border-slate-200 pt-4">
        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {error}
              {errorTab && errorTab !== tab ? ` (see ${errorTab === "rubric" ? "Assessment rubric" : "Details"})` : ""}
            </span>
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="hidden text-xs text-slate-500 sm:block">
            {rubricInvalid
              ? "Rubric incomplete: weights must total 100% with valid names."
              : "Rubric ready. Use the × button to discard without saving."}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
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
              disabled={submitting || (tab === "rubric" && rubricInvalid)}
              title={
                tab === "rubric" && rubricInvalid
                  ? "Fix rubric weights and names to save"
                  : undefined
              }
              onClick={requestSave}
            >
              {mode === "create" ? "Create submission" : "Save changes"}
            </Button>
          </div>
        </div>
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

function FieldError({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1 text-[11px] font-medium text-red-600" role="alert">
      <AlertCircle className="size-3 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
  columns,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string; badge?: ReactNode }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  columns?: 2;
  ariaLabel?: string;
}) {
  return (
    <div
      role={ariaLabel ? "tablist" : undefined}
      aria-label={ariaLabel}
      className={cn(
        "grid gap-1 rounded-xl border-2 border-slate-900 bg-white p-1",
        columns === 2 ? "grid-cols-2" : "grid-cols-1 min-[420px]:grid-cols-2",
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role={ariaLabel ? "tab" : undefined}
          aria-selected={ariaLabel ? value === option.value : undefined}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex cursor-pointer items-center justify-center gap-2 rounded-lg px-2 py-2 text-center text-sm leading-tight font-semibold transition disabled:cursor-not-allowed",
            value === option.value
              ? "bg-inkcuba-navy text-white shadow-inkcuba"
              : "text-slate-600 hover:bg-slate-50",
          )}
        >
          <span>{option.label}</span>
          {option.badge}
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
