import { z } from "zod";

import {
  PROJECT_LINK_LABEL_MAX,
  PROJECT_OTHER_LINK_MAX,
  PROJECT_STATUSES,
  PROJECT_TITLE_MAX,
  PROJECT_TITLE_MIN,
  PROJECT_DESCRIPTION_MAX_HTML,
} from "@/lib/projects/limits";

const httpUrl = z
  .string()
  .trim()
  .url("Enter a valid URL")
  .max(500)
  .refine((value) => /^https?:\/\//i.test(value), "URL must start with http:// or https://");

const optionalUrl = z.union([httpUrl, z.literal(""), z.null()]).optional();

export const projectWriteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(PROJECT_TITLE_MIN, `Title must be at least ${PROJECT_TITLE_MIN} characters`)
    .max(PROJECT_TITLE_MAX, `Title must be at most ${PROJECT_TITLE_MAX} characters`),
  description: z.string().max(PROJECT_DESCRIPTION_MAX_HTML).nullable().optional(),
  demoUrl: optionalUrl,
  videoUrl: optionalUrl,
  sourceUrl: optionalUrl,
  links: z
    .array(
      z.object({
        label: z.string().trim().max(PROJECT_LINK_LABEL_MAX).optional().default(""),
        url: httpUrl,
      }),
    )
    .max(PROJECT_OTHER_LINK_MAX)
    .optional()
    .default([]),
  expectedUpdatedAt: z.string().trim().optional(),
});

export const projectListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
  q: z.string().trim().max(200).optional().default(""),
  status: z.enum(["ALL", ...PROJECT_STATUSES]).default("ALL"),
  sortBy: z.enum(["updatedAt", "title", "status"]).default("updatedAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const LECTURER_PROJECT_SORT_FIELDS = ["updatedAt", "title", "status"] as const;
export type LecturerProjectSortField = (typeof LECTURER_PROJECT_SORT_FIELDS)[number];

export const LECTURER_SCORING_SUBMISSION_SORT_FIELDS = [
  "updatedAt",
  "title",
  "awaitingReview",
  "maxScore",
] as const;
export type LecturerScoringSubmissionSortField =
  (typeof LECTURER_SCORING_SUBMISSION_SORT_FIELDS)[number];

/** Statuses that belong in Scoring (never DRAFT). */
export const SCORING_PROJECT_STATUSES = [
  "SUBMITTED",
  "IN_REVIEW",
  "NEED_REVISION",
  "REVISED",
  "PUBLISHED",
] as const;

export const lecturerScoringSubmissionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
  q: z.string().trim().max(200).optional().default(""),
  type: z.enum(["ALL", "INDIVIDUAL", "GROUP"]).default("ALL"),
  sortBy: z.enum(LECTURER_SCORING_SUBMISSION_SORT_FIELDS).default("awaitingReview"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const lecturerProjectListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
  q: z.string().trim().max(200).optional().default(""),
  status: z
    .enum([
      "ALL",
      "NEEDS_ATTENTION",
      "SUBMITTED",
      "IN_REVIEW",
      "NEED_REVISION",
      "REVISED",
      "PUBLISHED",
    ])
    .default("NEEDS_ATTENTION"),
  sortBy: z.enum(LECTURER_PROJECT_SORT_FIELDS).default("updatedAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  submissionId: z.string().trim().uuid().optional().or(z.literal("")),
});

export type LecturerScoringSubmissionListQuery = z.infer<
  typeof lecturerScoringSubmissionListQuerySchema
>;

/** HTML markup may exceed plain-text cap; server sanitizes and enforces plain length. */
const FEEDBACK_HTML_MAX = 25_000;

export const lecturerModerateComponentScoreSchema = z.object({
  rubricComponentId: z.string().trim().uuid(),
  score: z.coerce.number().int().min(0),
});

/** GROUP_AND_INDIVIDUAL: each member is scored on the same rubric components as the group. */
export const lecturerModerateMemberScoreSchema = z.object({
  userId: z.string().trim().uuid(),
  componentScores: z.array(lecturerModerateComponentScoreSchema).min(1),
});

export const lecturerModerateSchema = z
  .object({
    decision: z.enum(["REVISION", "PUBLISH"]),
    feedback: z.string().trim().max(FEEDBACK_HTML_MAX).optional().default(""),
    expectedUpdatedAt: z.string().trim().optional(),
    /** Required for PUBLISH; ignored for REVISION (feedback-only). */
    scoringMode: z
      .enum(["INDIVIDUAL", "GROUP_ONLY", "GROUP_AND_INDIVIDUAL"])
      .optional(),
    groupPercent: z.coerce.number().int().min(0).max(100).optional(),
    individualPercent: z.coerce.number().int().min(0).max(100).optional(),
    /** Group (or individual-submission) rubric component scores. */
    componentScores: z.array(lecturerModerateComponentScoreSchema).optional().default([]),
    memberScores: z.array(lecturerModerateMemberScoreSchema).optional().default([]),
  })
  .superRefine((value, ctx) => {
    if (value.decision === "REVISION") {
      if (!value.feedback || value.feedback.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["feedback"],
          message: "Feedback is required when you request a revision",
        });
      }
      return;
    }

    if (!value.scoringMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scoringMode"],
        message: "Choose a scoring mode to publish",
      });
      return;
    }
    if (!value.componentScores || value.componentScores.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["componentScores"],
        message: "Score every rubric component before publishing",
      });
    }
    if (value.scoringMode === "INDIVIDUAL" || value.scoringMode === "GROUP_ONLY") {
      if (value.groupPercent != null && value.groupPercent !== 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["groupPercent"],
          message: "Group-only and individual modes use 100% group weight",
        });
      }
      if (value.individualPercent != null && value.individualPercent !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["individualPercent"],
          message: "Individual percent must be 0 unless using group + individual",
        });
      }
    }
    if (value.scoringMode === "GROUP_AND_INDIVIDUAL") {
      const groupPct = value.groupPercent ?? 0;
      const individualPct = value.individualPercent ?? 0;
      if (groupPct + individualPct !== 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["groupPercent"],
          message: "Group and individual percents must total 100%",
        });
      }
      if (!value.memberScores || value.memberScores.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["memberScores"],
          message: "Score every rubric component for each group member",
        });
      }
    }
  });

export const portfolioEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type ProjectWriteInput = z.infer<typeof projectWriteSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
export type LecturerProjectListQuery = z.infer<typeof lecturerProjectListQuerySchema>;
export type LecturerModerateInput = z.infer<typeof lecturerModerateSchema>;
