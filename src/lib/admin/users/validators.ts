import { z } from "zod";

import {
  USER_LIST_DEFAULT_PAGE_SIZE,
  USER_LIST_MAX_PAGE_SIZE,
  USER_SORT_FIELDS,
} from "@/lib/admin/users/constants";
import { personNameSchema } from "@/lib/validators/common";

export const adminUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(USER_LIST_MAX_PAGE_SIZE)
    .default(USER_LIST_DEFAULT_PAGE_SIZE),
  q: z.string().trim().max(200).optional().default(""),
  role: z.enum(["ALL", "STUDENT", "LECTURER", "ADMIN"]).default("ALL"),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
  sortBy: z.enum(USER_SORT_FIELDS).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  trash: z.boolean().default(false),
});

/** Empty string / null clears the field; omit leaves unchanged. */
const clearableText = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  });

const clearableId = (label: string) =>
  clearableText.superRefine((value, ctx) => {
    if (value == null || value === undefined) return;
    if (value.length < 5) {
      ctx.addIssue({
        code: "custom",
        message: `${label} must be at least 5 characters`,
      });
    }
    if (value.length > 32) {
      ctx.addIssue({
        code: "custom",
        message: `${label} must be at most 32 characters`,
      });
    }
    if (!/^[A-Za-z0-9_-]+$/.test(value)) {
      ctx.addIssue({
        code: "custom",
        message: `${label} may only include letters, numbers, _ and -`,
      });
    }
  });

export const adminUserPatchSchema = z
  .object({
    role: z.enum(["STUDENT", "LECTURER", "ADMIN"]).optional(),
    isActive: z.boolean().optional(),
    name: personNameSchema.optional(),
    campus: clearableText,
    nim: clearableId("Student ID"),
    nidn: clearableId("Lecturer ID"),
    major: clearableText,
    batch: clearableText,
    semester: clearableText,
    department: clearableText,
    title: clearableText.superRefine((value, ctx) => {
      if (value == null || value === undefined) return;
      if (value.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Title must be at least 2 characters",
        });
      }
      if (value.length > 80) {
        ctx.addIssue({
          code: "custom",
          message: "Title must be at most 80 characters",
        });
      }
    }),
  })
  .refine(
    (value) =>
      value.role !== undefined ||
      value.isActive !== undefined ||
      value.name !== undefined ||
      value.campus !== undefined ||
      value.nim !== undefined ||
      value.nidn !== undefined ||
      value.major !== undefined ||
      value.batch !== undefined ||
      value.semester !== undefined ||
      value.department !== undefined ||
      value.title !== undefined,
    { message: "Provide at least one field to update" },
  );

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminUserPatchInput = z.infer<typeof adminUserPatchSchema>;

export function parseTrashFlag(raw: string | null): boolean {
  if (!raw) return false;
  return raw === "true" || raw === "1";
}
