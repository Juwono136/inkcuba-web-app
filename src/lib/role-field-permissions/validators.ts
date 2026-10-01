import { z } from "zod";

import { SETTINGS_IDENTITY_FIELDS } from "@/lib/role-field-permissions/types";

export const roleFieldPermissionUpsertSchema = z.object({
  role: z.enum(["STUDENT", "LECTURER", "ADMIN"]),
  field: z.enum(SETTINGS_IDENTITY_FIELDS),
  editableBySelf: z.boolean(),
});

export const roleFieldPermissionBulkUpsertSchema = z.object({
  items: z
    .array(roleFieldPermissionUpsertSchema)
    .min(1)
    .max(SETTINGS_IDENTITY_FIELDS.length * 3),
});

export type RoleFieldPermissionUpsertInput = z.infer<
  typeof roleFieldPermissionUpsertSchema
>;
export type RoleFieldPermissionBulkUpsertInput = z.infer<
  typeof roleFieldPermissionBulkUpsertSchema
>;
