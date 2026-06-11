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

export type PaginationInput = z.infer<typeof paginationSchema>;
