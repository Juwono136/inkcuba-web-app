"use client";

import { Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { WorkspaceRichTextEditor } from "@/components/lecturer/workspaces/workspace-rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  optionsForCategory,
  useAllDirectoryOptions,
} from "@/hooks/use-directory-options";
import { plainTextFromHtml } from "@/lib/settings/plain-text";
import { cn } from "@/lib/utils";
import {
  WORKSPACE_CLASS_NAME_MAX,
  WORKSPACE_DESCRIPTION_MAX_PLAIN,
  WORKSPACE_NAME_MAX,
  WORKSPACE_NAME_MIN,
  WORKSPACE_STATUS_HINTS,
  WORKSPACE_STATUS_LABELS,
  WORKSPACE_STATUSES,
  type WorkspaceStatus,
} from "@/lib/workspaces/types";

export type WorkspaceFormValues = {
  name: string;
  className: string;
  semester: string;
  description: string;
  status: WorkspaceStatus;
};

type WorkspaceFormProps = {
  initial: WorkspaceFormValues;
  mode: "create" | "edit";
  submitting?: boolean;
  currentSemesterValue?: string | null;
  backgroundPreviewUrl?: string | null;
  imageUploadUrl: string;
  onSubmit: (input: {
    values: WorkspaceFormValues;
    backgroundFile: File | null;
    clearBackground: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
};

const MAX_BACKGROUND_BYTES = 10 * 1024 * 1024;

export function WorkspaceForm({
  initial,
  mode,
  submitting = false,
  currentSemesterValue,
  backgroundPreviewUrl = null,
  imageUploadUrl,
  onSubmit,
  onCancel,
}: WorkspaceFormProps) {
  const directoryQuery = useAllDirectoryOptions();
  const semesterOptions = useMemo(
    () =>
      optionsForCategory(
        directoryQuery.data,
        "semester",
        currentSemesterValue ?? initial.semester,
      ),
    [directoryQuery.data, currentSemesterValue, initial.semester],
  );

  const [values, setValues] = useState<WorkspaceFormValues>(initial);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [clearBackground, setClearBackground] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const previewUrl =
    localPreview ??
    (clearBackground ? null : backgroundPreviewUrl);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    const name = values.name.trim();
    const className = values.className.trim();
    const semester = values.semester.trim();

    if (name.length < WORKSPACE_NAME_MIN) {
      errors.name = `Name must be at least ${WORKSPACE_NAME_MIN} characters`;
    } else if (name.length > WORKSPACE_NAME_MAX) {
      errors.name = `Name must be at most ${WORKSPACE_NAME_MAX} characters`;
    }

    if (!className) {
      errors.className = "Class name is required";
    } else if (className.length > WORKSPACE_CLASS_NAME_MAX) {
      errors.className = `Class name must be at most ${WORKSPACE_CLASS_NAME_MAX} characters`;
    }

    if (!semester) {
      errors.semester = "Semester is required";
    }

    const plain = plainTextFromHtml(values.description);
    if (plain.length > WORKSPACE_DESCRIPTION_MAX_PLAIN) {
      errors.description = `Description must be at most ${WORKSPACE_DESCRIPTION_MAX_PLAIN} characters`;
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error(Object.values(errors)[0]);
      return false;
    }
    return true;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    await onSubmit({
      values: {
        name: values.name.trim(),
        className: values.className.trim(),
        semester: values.semester.trim(),
        description: values.description,
        status: values.status,
      },
      backgroundFile,
      clearBackground,
    });
  }

  function onBackgroundPicked(file: File | null) {
    if (!file) return;
    if (file.size > MAX_BACKGROUND_BYTES) {
      toast.error("Background image must be under 10MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Background must be an image file");
      return;
    }
    setBackgroundFile(file);
    setClearBackground(false);
    const url = URL.createObjectURL(file);
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="workspace-name">Workspace name</Label>
          <Input
            id="workspace-name"
            value={values.name}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="e.g. Capstone Studio — Even 2026"
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.name)}
            className="rounded-xl border-2 border-slate-900 bg-white"
            maxLength={WORKSPACE_NAME_MAX}
          />
          {fieldErrors.name ? (
            <p className="text-xs text-red-600">{fieldErrors.name}</p>
          ) : (
            <p className="text-xs text-slate-500">
              {WORKSPACE_NAME_MIN}–{WORKSPACE_NAME_MAX} characters.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="workspace-class">Class name</Label>
          <Input
            id="workspace-class"
            value={values.className}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, className: event.target.value }))
            }
            placeholder="e.g. LA01"
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.className)}
            className="rounded-xl border-2 border-slate-900 bg-white"
            maxLength={WORKSPACE_CLASS_NAME_MAX}
          />
          {fieldErrors.className ? (
            <p className="text-xs text-red-600">{fieldErrors.className}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="workspace-semester">Semester</Label>
          <Select
            value={values.semester || undefined}
            onValueChange={(next) =>
              setValues((prev) => ({ ...prev, semester: next }))
            }
            disabled={submitting || directoryQuery.isLoading}
          >
            <SelectTrigger
              id="workspace-semester"
              className="h-10 w-full rounded-xl border-2 border-slate-900 bg-white"
              aria-invalid={Boolean(fieldErrors.semester)}
            >
              <SelectValue placeholder="Select semester…" />
            </SelectTrigger>
            <SelectContent>
              {semesterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.semester ? (
            <p className="text-xs text-red-600">{fieldErrors.semester}</p>
          ) : directoryQuery.isError ? (
            <p className="text-xs text-amber-700">
              Could not load semester options. Refresh and try again.
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Synced from Admin Directory Options.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Workspace status</Label>
        <div
          className="grid gap-2 sm:grid-cols-3"
          role="radiogroup"
          aria-label="Workspace status"
        >
          {WORKSPACE_STATUSES.map((status) => {
            const selected = values.status === status;
            return (
              <button
                key={status}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={submitting}
                onClick={() =>
                  setValues((prev) => ({ ...prev, status }))
                }
                className={cn(
                  "rounded-2xl border-2 px-3 py-3 text-left transition",
                  selected
                    ? status === "ACTIVE"
                      ? "border-emerald-600 bg-emerald-50 shadow-sm"
                      : status === "DRAFT"
                        ? "border-amber-500 bg-amber-50 shadow-sm"
                        : "border-slate-700 bg-slate-100 shadow-sm"
                    : "border-slate-300 bg-white hover:border-slate-500",
                  submitting && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "text-sm font-bold",
                    selected ? "text-slate-900" : "text-slate-700",
                  )}
                >
                  {WORKSPACE_STATUS_LABELS[status]}
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-slate-500">
                  {WORKSPACE_STATUS_HINTS[status]}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          Only <span className="font-semibold text-slate-700">Active</span>{" "}
          workspaces can be accessed by students. Draft and Inactive stay
          lecturer-only.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Background image (optional)</Label>
        <div className="overflow-hidden rounded-2xl border-2 border-inkcuba-navy">
          <div className="relative h-36 w-full sm:h-40">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Workspace background preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <WorkspaceDefaultBackground className="h-full w-full" />
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-slate-900"
            disabled={submitting}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {previewUrl ? "Replace image" : "Upload image"}
          </Button>
          {previewUrl || backgroundPreviewUrl ? (
            <Button
              type="button"
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              disabled={submitting}
              onClick={() => {
                setBackgroundFile(null);
                setClearBackground(true);
                setLocalPreview((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return null;
                });
              }}
            >
              <Trash2 className="h-4 w-4" />
              Use default
            </Button>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
            className="hidden"
            onChange={(event) =>
              onBackgroundPicked(event.target.files?.[0] ?? null)
            }
          />
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          Recommended{" "}
          <span className="font-semibold text-slate-700">
            1600 × 480 px
          </span>{" "}
          (about 10:3 / landscape banner). JPG, PNG, WebP, or HEIC up to 10MB.
          Images are cropped with cover fit — wider landscapes look best. Leave
          empty to use the inkcuba gradient default.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <WorkspaceRichTextEditor
          value={values.description}
          onChange={(html) =>
            setValues((prev) => ({ ...prev, description: html }))
          }
          disabled={submitting}
          imageUploadUrl={imageUploadUrl}
          placeholder="Syllabus notes, goals, or welcome message for your class…"
        />
        {fieldErrors.description ? (
          <p className="text-xs text-red-600">{fieldErrors.description}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            className="border-slate-900"
            disabled={submitting}
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}
        <Button
          type="submit"
          className="bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : mode === "create" ? (
            "Create workspace"
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}

export function WorkspaceDefaultBackground({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-sky-200 via-violet-100 to-orange-100",
        compact ? "aspect-[2/1]" : "h-full min-h-[9rem]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-inkcuba-doodle opacity-40" />
      <div className="relative flex flex-col items-center gap-2 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-inkcuba-navy bg-white/90 p-2 shadow-inkcuba sm:h-14 sm:w-14">
          <Image
            src="/images/inkcuba-logo.png"
            alt="inkcuba"
            width={40}
            height={40}
            className="h-8 w-8 object-contain sm:h-10 sm:w-10"
          />
        </div>
        <p className="font-heading text-xs font-bold tracking-wide text-inkcuba-navy uppercase sm:text-sm">
          inkcuba workspace
        </p>
      </div>
    </div>
  );
}
