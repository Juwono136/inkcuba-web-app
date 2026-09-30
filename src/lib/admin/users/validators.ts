import { z } from "zod";

import {
  USER_LIST_DEFAULT_PAGE_SIZE,
  USER_LIST_MAX_PAGE_SIZE,
  USER_SORT_FIELDS,
} from "@/lib/admin/users/constants";

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
  /** Soft-deleted users only when true. */
  trash: z.boolean().default(false),
});

export const adminUserPatchSchema = z
  .object({
    role: z.enum(["STUDENT", "LECTURER", "ADMIN"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) => value.role !== undefined || value.isActive !== undefined,
    { message: "Provide at least one of: role, isActive" },
  );

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminUserPatchInput = z.infer<typeof adminUserPatchSchema>;

export function parseTrashFlag(raw: string | null): boolean {
  if (!raw) return false;
  return raw === "true" || raw === "1";
}
