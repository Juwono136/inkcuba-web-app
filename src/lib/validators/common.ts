import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const youtubeUrlSchema = z
  .string()
  .url()
  .regex(
    /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+/i,
    "Invalid YouTube URL",
  );

export const websiteUrlSchema = z.string().url("Invalid URL");

export const portfolioTitleSchema = z
  .string()
  .trim()
  .min(3, "Title must be at least 3 characters")
  .max(100, "Title must be at most 100 characters");

/** Shared display-name rules for signup-adjacent identity edits (admin + My Settings). */
export const PERSON_NAME_MIN = 2;
export const PERSON_NAME_MAX = 100;
/** Letters, marks, spaces, dashes, and common punctuation (e.g. "Manuaba, Ph.D"). */
export const PERSON_NAME_PATTERN = /^[\p{L}\p{M}\p{Pd}\s'.,()]+$/u;
export const PERSON_NAME_PATTERN_MESSAGE =
  "Name may only include letters, spaces, and ' . , - ( )";

export const personNameSchema = z
  .string()
  .trim()
  .min(PERSON_NAME_MIN, `Name must be at least ${PERSON_NAME_MIN} characters`)
  .max(PERSON_NAME_MAX, `Name must be at most ${PERSON_NAME_MAX} characters`)
  .regex(PERSON_NAME_PATTERN, PERSON_NAME_PATTERN_MESSAGE);

/** Returns the first validation error message, or `null` when valid. */
export function validatePersonName(value: string): string | null {
  const result = personNameSchema.safeParse(value);
  if (result.success) return null;
  return result.error.issues[0]?.message ?? PERSON_NAME_PATTERN_MESSAGE;
}

export type PaginationInput = z.infer<typeof paginationSchema>;
