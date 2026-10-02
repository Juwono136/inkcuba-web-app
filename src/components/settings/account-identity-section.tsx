"use client";

import { Lock, Loader2, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { SettingsSectionCard } from "@/components/settings/settings-section-card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import type {
  SettingsIdentity,
  SettingsPayload,
} from "@/lib/settings/get-settings";
import type { SettingsIdentityField } from "@/lib/role-field-permissions/types";
import { SETTINGS_IDENTITY_FIELD_LABELS } from "@/lib/role-field-permissions/types";
import {
  PERSON_NAME_MAX,
  PERSON_NAME_MIN,
  validatePersonName,
} from "@/lib/validators/common";

type AccountIdentitySectionProps = {
  identity: SettingsIdentity;
  onIdentitySaved?: (settings: SettingsPayload) => void;
};

const CLEAR_VALUE = "__clear__";

function displayValue(value: string | null | undefined): string {
  if (value == null || value.trim() === "") return "-";
  return value;
}

function IdentityField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <p
        className="text-sm font-medium break-words text-slate-900 [overflow-wrap:anywhere]"
        title={value !== "-" ? value : undefined}
      >
        {value}
      </p>
    </div>
  );
}

type FormState = {
  name: string;
  title: string;
  campus: string;
  nim: string;
  nidn: string;
  major: string;
  batch: string;
  semester: string;
  department: string;
};

function formFromIdentity(identity: SettingsIdentity): FormState {
  return {
    name: identity.name,
    title: identity.title ?? "",
    campus: identity.campus ?? "",
    nim: identity.nim ?? identity.binusianId ?? "",
    nidn: identity.nidn ?? "",
    major: identity.major ?? "",
    batch: identity.batch ?? "",
    semester: identity.semester ?? "",
    department: identity.department ?? "",
  };
}

export function AccountIdentitySection({
  identity,
  onIdentitySaved,
}: AccountIdentitySectionProps) {
  const editableFields = identity.editableFields ?? [];
  const canEdit = editableFields.length > 0;
  const directoryQuery = useAllDirectoryOptions();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(() => formFromIdentity(identity));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fields: { label: string; value: string }[] = useMemo(() => {
    const labelOf = (
      key: "campus" | "major" | "batch" | "semester" | "department",
      stored: string | null,
    ) => displayValue(identity.directoryLabels?.[key] ?? stored);

    const base: { label: string; value: string }[] = [
      { label: "Full name", value: displayValue(identity.name) },
      { label: "Email", value: displayValue(identity.email) },
      { label: "Role", value: displayValue(identity.roleLabel) },
      { label: "Campus", value: labelOf("campus", identity.campus) },
    ];

    if (identity.role === "STUDENT") {
      base.push(
        { label: "NIM / Student ID", value: displayValue(identity.nim) },
        { label: "Major", value: labelOf("major", identity.major) },
        { label: "Batch", value: labelOf("batch", identity.batch) },
        { label: "Semester", value: labelOf("semester", identity.semester) },
        {
          label: "Department",
          value: labelOf("department", identity.department),
        },
        { label: "Title", value: displayValue(identity.title) },
        {
          label: "Alumni status",
          value: identity.isAlumni
            ? displayValue(identity.alumniLabel)
            : "Active student",
        },
      );
    } else if (identity.role === "LECTURER") {
      base.push(
        { label: "BINUSIAN ID", value: displayValue(identity.binusianId) },
        { label: "NIDN / Lecturer ID", value: displayValue(identity.nidn) },
        { label: "Major", value: labelOf("major", identity.major) },
        {
          label: "Department",
          value: labelOf("department", identity.department),
        },
        { label: "Title", value: displayValue(identity.title) },
      );
    } else {
      base.push(
        { label: "BINUSIAN ID", value: displayValue(identity.binusianId) },
        { label: "Major", value: labelOf("major", identity.major) },
        {
          label: "Department",
          value: labelOf("department", identity.department),
        },
        { label: "Title", value: displayValue(identity.title) },
      );
    }
    return base;
  }, [identity]);

  function canEditField(field: SettingsIdentityField) {
    return editableFields.includes(field);
  }

  function startEdit() {
    setForm(formFromIdentity(identity));
    setFieldErrors({});
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setFieldErrors({});
  }

  function requestSave() {
    const errors: Record<string, string> = {};
    if (canEditField("name")) {
      const nameError = validatePersonName(form.name);
      if (nameError) errors.name = nameError;
    }
    if (canEditField("title")) {
      const trimmedTitle = form.title.trim();
      if (trimmedTitle && trimmedTitle.length < 2) {
        errors.title = "Title must be at least 2 characters";
      } else if (trimmedTitle.length > 80) {
        errors.title = "Title must be at most 80 characters";
      }
    }
    if (canEditField("nim") && form.nim.trim()) {
      const trimmed = form.nim.trim();
      if (trimmed.length < 5) {
        errors.nim = "ID must be at least 5 characters";
      } else if (trimmed.length > 32) {
        errors.nim = "ID must be at most 32 characters";
      } else if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
        errors.nim = "ID may only include letters, numbers, _ and -";
      }
    }
    if (canEditField("nidn") && form.nidn.trim()) {
      const trimmed = form.nidn.trim();
      if (trimmed.length < 5) {
        errors.nidn = "ID must be at least 5 characters";
      } else if (trimmed.length > 32) {
        errors.nidn = "ID must be at most 32 characters";
      } else if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
        errors.nidn = "ID may only include letters, numbers, _ and -";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }

    setFieldErrors({});
    setConfirmOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, string | null> = {};
      if (canEditField("name")) body.name = form.name.trim();
      if (canEditField("title")) body.title = form.title.trim() || null;
      if (canEditField("campus")) body.campus = form.campus.trim() || null;
      if (canEditField("nim")) body.nim = form.nim.trim() || null;
      if (canEditField("nidn")) body.nidn = form.nidn.trim() || null;
      if (canEditField("major")) body.major = form.major.trim() || null;
      if (canEditField("batch")) body.batch = form.batch.trim() || null;
      if (canEditField("semester")) body.semester = form.semester.trim() || null;
      if (canEditField("department"))
        body.department = form.department.trim() || null;

      const response = await fetch("/api/settings/identity", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as {
        success: boolean;
        data?: SettingsPayload;
        error?: { message: string };
      };
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? "Failed to update identity");
      }
      onIdentitySaved?.(payload.data);
      setEditing(false);
      toast.success("Identity updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update identity",
      );
    } finally {
      setSaving(false);
    }
  }

  const baseline = formFromIdentity(identity);
  const dirty = editableFields.some((field) => {
    const key = field as keyof FormState;
    return form[key].trim() !== baseline[key].trim();
  });

  function directoryOptions(
    category: "campus" | "major" | "batch" | "semester" | "department",
    current: string,
  ) {
    return optionsForCategory(
      directoryQuery.data,
      category,
      current.trim() ? current : null,
    );
  }

  function renderDirectorySelect(
    field: SettingsIdentityField,
    category: "campus" | "major" | "batch" | "semester" | "department",
  ) {
    if (!canEditField(field)) return null;
    const value = form[field as keyof FormState];
    const options = directoryOptions(category, value);
    return (
      <div key={field} className="min-w-0 space-y-2">
        <Label htmlFor={`identity-${field}`}>
          {SETTINGS_IDENTITY_FIELD_LABELS[field]}
        </Label>
        <Select
          value={value.trim() ? value : CLEAR_VALUE}
          onValueChange={(next) =>
            setForm((prev) => ({
              ...prev,
              [field]: next === CLEAR_VALUE ? "" : next,
            }))
          }
          disabled={saving || directoryQuery.isLoading}
        >
          <SelectTrigger
            id={`identity-${field}`}
            className="h-10 w-full rounded-xl border-2 border-slate-900 bg-white"
          >
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CLEAR_VALUE}>— leave empty to clear</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  function renderTextInput(field: SettingsIdentityField, placeholder: string) {
    if (!canEditField(field)) return null;
    return (
      <div key={field} className="min-w-0 space-y-2">
        <Label htmlFor={`identity-${field}`}>
          {SETTINGS_IDENTITY_FIELD_LABELS[field]}
        </Label>
        <Input
          id={`identity-${field}`}
          value={form[field as keyof FormState]}
          onChange={(event) => {
            setForm((prev) => ({ ...prev, [field]: event.target.value }));
            if (fieldErrors[field]) {
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
              });
            }
          }}
          placeholder={placeholder}
          disabled={saving}
          className="rounded-xl border-2 border-slate-900 bg-white"
          aria-invalid={Boolean(fieldErrors[field])}
        />
        {fieldErrors[field] ? (
          <p className="text-xs text-red-500">{fieldErrors[field]}</p>
        ) : field === "name" ? (
          <p className="text-xs text-slate-500">
            Letters, spaces, and punctuation such as , . &apos; - ( ) are
            allowed ({PERSON_NAME_MIN}–{PERSON_NAME_MAX} chars).
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <SettingsSectionCard
      title="Account Identity"
      description={
        canEdit
          ? "Institutional details. Editable fields are configured by administrators for your role."
          : "Institutional details managed by administrators."
      }
      delay={0.05}
    >
      {!canEdit ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
          <p>
            These fields are read-only. Contact an administrator if any identity
            information needs to be updated.
          </p>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-600">
            You can edit:{" "}
            {editableFields
              .map((field) => SETTINGS_IDENTITY_FIELD_LABELS[field])
              .join(", ")}
            .
          </p>
          {!editing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-inkcuba-navy"
              onClick={startEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit identity
            </Button>
          ) : null}
        </div>
      )}

      {editing && canEdit ? (
        <div className="mb-5 space-y-4 rounded-2xl border-2 border-inkcuba-navy bg-sky-50/40 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {renderTextInput("name", "e.g. Ida Bagus Manuaba, Ph.D")}
            {renderTextInput("title", "e.g. Senior Lecturer")}
            {renderDirectorySelect("campus", "campus")}
            {renderTextInput("nim", "BINUSIAN ID")}
            {renderTextInput("nidn", "NIDN")}
            {renderDirectorySelect("major", "major")}
            {renderDirectorySelect("batch", "batch")}
            {renderDirectorySelect("semester", "semester")}
            {renderDirectorySelect("department", "department")}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-slate-900"
              disabled={saving}
              onClick={cancelEdit}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600"
              disabled={saving || !dirty}
              onClick={requestSave}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <IdentityField
            key={field.label}
            label={field.label}
            value={field.value}
          />
        ))}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Update your identity?"
        description="Your identity details will be updated across inkcuba."
        confirmLabel="Save"
        onConfirm={handleSave}
      />
    </SettingsSectionCard>
  );
}
