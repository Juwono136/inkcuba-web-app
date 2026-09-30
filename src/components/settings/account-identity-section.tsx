"use client";

import { Lock, Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SettingsSectionCard } from "@/components/settings/settings-section-card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  SettingsIdentity,
  SettingsPayload,
} from "@/lib/settings/get-settings";

type AccountIdentitySectionProps = {
  identity: SettingsIdentity;
  onIdentitySaved?: (settings: SettingsPayload) => void;
};

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

export function AccountIdentitySection({
  identity,
  onIdentitySaved,
}: AccountIdentitySectionProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(identity.name);
  const [title, setTitle] = useState(identity.title ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fields: { label: string; value: string }[] = [
    { label: "Full name", value: displayValue(identity.name) },
    { label: "Email", value: displayValue(identity.email) },
    { label: "Role", value: displayValue(identity.roleLabel) },
    { label: "Campus", value: displayValue(identity.campus) },
  ];

  if (identity.role === "STUDENT") {
    fields.push(
      { label: "NIM / Student ID", value: displayValue(identity.nim) },
      { label: "Major", value: displayValue(identity.major) },
      { label: "Batch", value: displayValue(identity.batch) },
      { label: "Semester", value: displayValue(identity.semester) },
      { label: "Department", value: displayValue(identity.department) },
      { label: "Title", value: displayValue(identity.title) },
      {
        label: "Alumni status",
        value: identity.isAlumni
          ? displayValue(identity.alumniLabel)
          : "Active student",
      },
    );
  } else if (identity.role === "LECTURER") {
    fields.push(
      { label: "NIDN / Lecturer ID", value: displayValue(identity.nidn) },
      { label: "Major", value: displayValue(identity.major) },
      { label: "Department", value: displayValue(identity.department) },
      { label: "Title", value: displayValue(identity.title) },
    );
  } else {
    fields.push(
      { label: "BINUSIAN ID", value: displayValue(identity.binusianId) },
      { label: "Major", value: displayValue(identity.major) },
    );
  }

  function startEdit() {
    setName(identity.name);
    setTitle(identity.title ?? "");
    setFieldErrors({});
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setFieldErrors({});
  }

  function requestSave() {
    const errors: Record<string, string> = {};
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      errors.name = "Name must be at least 2 characters";
    } else if (trimmedName.length > 100) {
      errors.name = "Name must be at most 100 characters";
    } else if (!/^[\p{L}\p{M}\s'.-]+$/u.test(trimmedName)) {
      errors.name = "Name may only include letters, spaces, and ' . -";
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle && trimmedTitle.length < 2) {
      errors.title = "Title must be at least 2 characters";
    } else if (trimmedTitle.length > 80) {
      errors.title = "Title must be at most 80 characters";
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
      const response = await fetch("/api/settings/identity", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          title: title.trim() || null,
        }),
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
      throw error;
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    name.trim() !== identity.name ||
    (title.trim() || null) !== (identity.title ?? null);

  return (
    <SettingsSectionCard
      title="Account Identity"
      description={
        identity.canEditNameAndTitle
          ? "Institutional details. Lecturers can update name and title."
          : "Institutional details managed by administrators."
      }
      delay={0.05}
    >
      {!identity.canEditNameAndTitle ? (
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
            Campus, IDs, major, and department stay admin-managed. You can edit
            your display name and academic title.
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
              Edit name & title
            </Button>
          ) : null}
        </div>
      )}

      {editing && identity.canEditNameAndTitle ? (
        <div className="mb-5 space-y-4 rounded-2xl border-2 border-inkcuba-navy bg-sky-50/40 p-4">
          <div className="space-y-2">
            <Label htmlFor="lecturer-name">Full name</Label>
            <Input
              id="lecturer-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Ida Bagus Manuaba"
              disabled={saving}
              className="rounded-xl border-2 border-slate-900 bg-white"
              aria-invalid={Boolean(fieldErrors.name)}
            />
            {fieldErrors.name ? (
              <p className="text-xs text-red-500">{fieldErrors.name}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lecturer-title">Title</Label>
            <Input
              id="lecturer-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Senior Lecturer"
              disabled={saving}
              className="rounded-xl border-2 border-slate-900 bg-white"
              aria-invalid={Boolean(fieldErrors.title)}
            />
            {fieldErrors.title ? (
              <p className="text-xs text-red-500">{fieldErrors.title}</p>
            ) : (
              <p className="text-xs text-slate-500">
                Optional academic or professional title shown on your profile.
              </p>
            )}
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
        description="Your display name and title will be updated across inkcuba."
        confirmLabel="Save"
        onConfirm={handleSave}
      />
    </SettingsSectionCard>
  );
}
