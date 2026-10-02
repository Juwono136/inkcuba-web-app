import { z } from "zod";

import { isAllowedInstitutionalEmail } from "@/lib/auth/permissions";
import {
  WORKSPACE_CANDIDATES_PAGE_SIZE,
  WORKSPACE_MANUAL_ADD_MAX,
  WORKSPACE_MEMBERS_DEFAULT_PAGE_SIZE,
  WORKSPACE_MEMBERS_MAX_PAGE_SIZE,
  WORKSPACE_MEMBER_STATUSES,
  INVITE_CODE_PATTERN,
} from "@/lib/workspaces/members/types";

export const workspaceMembersListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(WORKSPACE_MEMBERS_MAX_PAGE_SIZE)
    .default(WORKSPACE_MEMBERS_DEFAULT_PAGE_SIZE),
  q: z.string().trim().max(200).optional().default(""),
  status: z
    .enum(["ALL", ...WORKSPACE_MEMBER_STATUSES])
    .default("ALL"),
});

export const workspaceCandidatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(WORKSPACE_CANDIDATES_PAGE_SIZE),
  q: z.string().trim().max(200).optional().default(""),
});

export const workspaceMembersAddSchema = z.object({
  userIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one student")
    .max(
      WORKSPACE_MANUAL_ADD_MAX,
      `You can add at most ${WORKSPACE_MANUAL_ADD_MAX} students at once`,
    ),
});

export const workspaceJoinSchema = z.object({
  code: z
    .string()
    .trim()
    .transform((value) => value.toLowerCase())
    .pipe(
      z
        .string()
        .regex(
          INVITE_CODE_PATTERN,
          "Invite code must be exactly 8 lowercase letters or digits",
        ),
    ),
  source: z.enum(["LINK", "CODE"]).default("CODE"),
});

export const workspaceImportItemPatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  nim: z
    .string()
    .trim()
    .min(5)
    .max(20)
    .regex(/^[a-zA-Z0-9]+$/, "Student code must be alphanumeric")
    .optional(),
  email: z
    .string()
    .trim()
    .email()
    .refine(
      (email) => isAllowedInstitutionalEmail(email),
      "Only @binus.edu or @binus.ac.id emails are allowed",
    )
    .optional(),
  majorLabel: z.string().trim().min(1).max(200).optional(),
  batchLabel: z.string().trim().min(1).max(200).optional(),
});

export const workspaceImportCommitSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
});

export type WorkspaceMembersListQuery = z.infer<
  typeof workspaceMembersListQuerySchema
>;
export type WorkspaceCandidatesQuery = z.infer<
  typeof workspaceCandidatesQuerySchema
>;
export type WorkspaceMembersAddInput = z.infer<typeof workspaceMembersAddSchema>;
export type WorkspaceJoinInput = z.infer<typeof workspaceJoinSchema>;
export type WorkspaceImportItemPatch = z.infer<
  typeof workspaceImportItemPatchSchema
>;
