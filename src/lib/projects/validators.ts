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

export type ProjectWriteInput = z.infer<typeof projectWriteSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
