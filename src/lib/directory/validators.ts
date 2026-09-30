import { z } from "zod";

import { DIRECTORY_OPTION_CATEGORIES } from "@/lib/directory/types";

export const directoryOptionCategorySchema = z.enum(DIRECTORY_OPTION_CATEGORIES);

export const directoryOptionCreateSchema = z.object({
  category: directoryOptionCategorySchema,
  label: z
    .string()
    .trim()
    .min(1, "Label is required")
    .max(120, "Label must be at most 120 characters"),
  isActive: z.boolean().optional().default(true),
});

export const directoryOptionUpdateSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(1, "Label is required")
      .max(120, "Label must be at most 120 characters")
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) => value.label !== undefined || value.isActive !== undefined,
    { message: "Provide at least one field to update" },
  );

export const directoryOptionListQuerySchema = z.object({
  category: directoryOptionCategorySchema.optional(),
  activeOnly: z.boolean().optional().default(false),
  q: z.string().trim().max(120).optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const directoryOptionReorderSchema = z.object({
  category: directoryOptionCategorySchema,
  /** New order for a contiguous subset (e.g. current page). */
  orderedIds: z
    .array(z.string().min(1))
    .min(1, "At least one option id is required")
    .max(500),
});

export type DirectoryOptionCreateInput = z.infer<
  typeof directoryOptionCreateSchema
>;
export type DirectoryOptionUpdateInput = z.infer<
  typeof directoryOptionUpdateSchema
>;
export type DirectoryOptionListQuery = z.infer<
  typeof directoryOptionListQuerySchema
>;
export type DirectoryOptionReorderInput = z.infer<
  typeof directoryOptionReorderSchema
>;
