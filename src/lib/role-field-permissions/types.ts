import type { UserRole } from "@/lib/auth/permissions";

export const SETTINGS_IDENTITY_FIELDS = [
  "name",
  "title",
  "campus",
  "nim",
  "nidn",
  "major",
  "batch",
  "semester",
  "department",
] as const;

export type SettingsIdentityField = (typeof SETTINGS_IDENTITY_FIELDS)[number];

export const SETTINGS_IDENTITY_FIELD_LABELS: Record<
  SettingsIdentityField,
  string
> = {
  name: "Full name",
  title: "Title",
  campus: "Campus",
  nim: "BINUSIAN ID / NIM",
  nidn: "NIDN (Lecturer ID)",
  major: "Major",
  batch: "Batch",
  semester: "Semester",
  department: "Department",
};

/** Fields that are meaningful for each role in My Settings. */
export const ROLE_RELEVANT_IDENTITY_FIELDS: Record<
  UserRole,
  SettingsIdentityField[]
> = {
  STUDENT: [
    "name",
    "title",
    "campus",
    "nim",
    "major",
    "batch",
    "semester",
    "department",
  ],
  LECTURER: ["name", "title", "campus", "nim", "nidn", "major", "department"],
  ADMIN: ["name", "title", "campus", "nim", "major", "department"],
};

/**
 * Defaults match pre-permissions product behavior:
 * students read-only; lecturers/admins can edit name + title.
 */
export const DEFAULT_ROLE_FIELD_EDITABLE: Record<
  UserRole,
  Partial<Record<SettingsIdentityField, boolean>>
> = {
  STUDENT: {},
  LECTURER: { name: true, title: true },
  ADMIN: { name: true, title: true },
};

export type RoleFieldPermissionRecord = {
  id: string;
  role: UserRole;
  field: SettingsIdentityField;
  editableBySelf: boolean;
  updatedAt: string;
};

export type RoleFieldPermissionMatrix = Record<
  UserRole,
  Record<SettingsIdentityField, boolean>
>;
