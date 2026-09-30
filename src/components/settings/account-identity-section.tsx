"use client";

import { Lock } from "lucide-react";

import { SettingsSectionCard } from "@/components/settings/settings-section-card";
import type { SettingsIdentity } from "@/lib/settings/get-settings";

type AccountIdentitySectionProps = {
  identity: SettingsIdentity;
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
    <div className="space-y-1">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

export function AccountIdentitySection({
  identity,
}: AccountIdentitySectionProps) {
  const fields: { label: string; value: string }[] = [
    { label: "Full name", value: displayValue(identity.name) },
    { label: "Email", value: displayValue(identity.email) },
    { label: "Role", value: displayValue(identity.roleLabel) },
    { label: "Campus", value: displayValue(identity.campus) },
    { label: "BINUSIAN ID", value: displayValue(identity.binusianId) },
    { label: "Major", value: displayValue(identity.major) },
  ];

  if (identity.role === "STUDENT") {
    fields.push(
      { label: "Batch", value: displayValue(identity.batch) },
      { label: "Semester", value: displayValue(identity.semester) },
      {
        label: "Alumni status",
        value: identity.isAlumni
          ? displayValue(identity.alumniLabel)
          : "Active student",
      },
    );
  }

  if (identity.role === "LECTURER") {
    fields.push(
      { label: "Department", value: displayValue(identity.department) },
      { label: "Title", value: displayValue(identity.title) },
    );
  }

  return (
    <SettingsSectionCard
      title="Account Identity"
      description="Institutional details managed by administrators."
      delay={0.05}
    >
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
        <p>
          These fields are read-only. Contact an administrator if any identity
          information needs to be updated.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <IdentityField
            key={field.label}
            label={field.label}
            value={field.value}
          />
        ))}
      </div>
    </SettingsSectionCard>
  );
}
