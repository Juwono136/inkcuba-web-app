import { z } from "zod";

import {
  SUBMISSION_DESCRIPTION_MAX_HTML,
  SUBMISSION_GROUP_METHODS,
  SUBMISSION_GROUP_ADD_MAX,
  SUBMISSION_GROUP_SIZE_MAX,
  SUBMISSION_GROUP_SIZE_MIN,
  SUBMISSION_LIST_DEFAULT_PAGE_SIZE,
  SUBMISSION_LIST_MAX_PAGE_SIZE,
  SUBMISSION_SCORE_MAX,
  SUBMISSION_SCORE_MIN,
  SUBMISSION_SORT_FIELDS,
  SUBMISSION_STATUSES,
  SUBMISSION_TITLE_MAX,
  SUBMISSION_TITLE_MIN,
  SUBMISSION_TYPES,
} from "@/lib/workspaces/submissions/types";

const pageSchema = z.coerce.number().int().min(1).default(1);
const pageSizeSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(SUBMISSION_LIST_MAX_PAGE_SIZE)
  .default(SUBMISSION_LIST_DEFAULT_PAGE_SIZE);

export const submissionListQuerySchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
  q: z.string().trim().max(200).optional().default(""),
  status: z.enum(["ALL", ...SUBMISSION_STATUSES]).default("ALL"),
  type: z.enum(["ALL", ...SUBMISSION_TYPES]).default("ALL"),
  sortBy: z.enum(SUBMISSION_SORT_FIELDS).default("updatedAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const studentSubmissionListQuerySchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
  q: z.string().trim().max(200).optional().default(""),
  type: z.enum(["ALL", ...SUBMISSION_TYPES]).default("ALL"),
  status: z.enum(["ALL", "ACTIVE", "CLOSED"]).default("ALL"),
  sortBy: z.enum(SUBMISSION_SORT_FIELDS).default("updatedAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const addSubmissionGroupsSchema = z.object({
  count: z
    .number()
    .int("Group count must be a whole number")
    .min(1, "Add at least 1 group")
    .max(
      SUBMISSION_GROUP_ADD_MAX,
      `Add at most ${SUBMISSION_GROUP_ADD_MAX} groups at once`,
    ),
});

export const submissionGroupsQuerySchema = z.object({
  page: pageSchema,
  pageSize: z.coerce.number().int().min(1).max(24).default(6),
  unassignedPage: z.coerce.number().int().min(1).default(1),
  q: z.string().trim().max(200).optional().default(""),
});

function parseDateTime(value: string): Date | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export const submissionWriteSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(SUBMISSION_TITLE_MIN, `Title must be at least ${SUBMISSION_TITLE_MIN} characters`)
      .max(SUBMISSION_TITLE_MAX, `Title must be at most ${SUBMISSION_TITLE_MAX} characters`),
    description: z
      .string()
      .max(SUBMISSION_DESCRIPTION_MAX_HTML)
      .optional()
      .nullable(),
    maxScore: z
      .number()
      .int("Maximum score must be a whole number")
      .min(SUBMISSION_SCORE_MIN, `Maximum score must be at least ${SUBMISSION_SCORE_MIN}`)
      .max(SUBMISSION_SCORE_MAX, `Maximum score must be at most ${SUBMISSION_SCORE_MAX}`),
    scheduleMode: z.enum(["OPEN", "WINDOW"]),
    opensAt: z.string().trim().optional().nullable(),
    closesAt: z.string().trim().optional().nullable(),
    type: z.enum(SUBMISSION_TYPES),
    groupMethod: z.enum(SUBMISSION_GROUP_METHODS).optional().nullable(),
    maxGroupSize: z
      .number()
      .int()
      .min(SUBMISSION_GROUP_SIZE_MIN)
      .max(SUBMISSION_GROUP_SIZE_MAX)
      .nullable()
      .optional(),
    status: z.enum(["DRAFT", "ACTIVE"]).default("DRAFT"),
  })
  .superRefine((value, ctx) => {
    if (value.scheduleMode === "OPEN") return;

    const opens = value.opensAt ? parseDateTime(value.opensAt) : null;
    const closes = value.closesAt ? parseDateTime(value.closesAt) : null;
    if (!opens) {
      ctx.addIssue({
        code: "custom",
        path: ["opensAt"],
        message: "Opening date is required",
      });
    }
    if (!closes) {
      ctx.addIssue({
        code: "custom",
        path: ["closesAt"],
        message: "Closing date is required",
      });
    }
    if (opens && closes && closes.getTime() - opens.getTime() < 60_000) {
      ctx.addIssue({
        code: "custom",
        path: ["closesAt"],
        message: "Closing date must be at least one minute after the opening date",
      });
    }
  })
  .superRefine((value, ctx) => {
    if (value.type === "INDIVIDUAL") return;
    if (!value.groupMethod) {
      ctx.addIssue({
        code: "custom",
        path: ["groupMethod"],
        message: "Choose how groups are formed",
      });
    }
    if (value.maxGroupSize == null) {
      ctx.addIssue({
        code: "custom",
        path: ["maxGroupSize"],
        message: "Maximum members per group is required",
      });
    }
  });

export const submissionMoveSchema = z.object({
  userId: z.string().trim().min(1).max(80),
  toGroupId: z.string().trim().min(1).max(80).nullable(),
});

export const studentSubmissionMoveSchema = z.object({
  toGroupId: z.string().trim().min(1, "Choose a group").max(80),
});

export type SubmissionWriteInput = z.infer<typeof submissionWriteSchema>;
export type SubmissionListQuery = z.infer<typeof submissionListQuerySchema>;
export type StudentSubmissionListQuery = z.infer<
  typeof studentSubmissionListQuerySchema
>;
export type SubmissionGroupsQuery = z.infer<typeof submissionGroupsQuerySchema>;
export type AddSubmissionGroupsInput = z.infer<typeof addSubmissionGroupsSchema>;
export type SubmissionMoveInput = z.infer<typeof submissionMoveSchema>;
