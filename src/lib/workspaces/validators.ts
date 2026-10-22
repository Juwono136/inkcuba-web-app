import { z } from "zod";



import {

  WORKSPACE_CLASS_NAME_MAX,

  WORKSPACE_CLASS_NAME_MIN,

  WORKSPACE_DESCRIPTION_MAX_PLAIN,

  WORKSPACE_LIST_DEFAULT_PAGE_SIZE,

  WORKSPACE_LIST_MAX_PAGE_SIZE,

  WORKSPACE_LIST_SORT_FIELDS,

  WORKSPACE_NAME_MAX,

  WORKSPACE_NAME_MIN,

  WORKSPACE_STATUSES,

} from "@/lib/workspaces/types";



export const workspaceStatusSchema = z.enum(WORKSPACE_STATUSES);



export const workspaceListQuerySchema = z.object({

  page: z.coerce.number().int().min(1).default(1),

  pageSize: z.coerce

    .number()

    .int()

    .min(1)

    .max(WORKSPACE_LIST_MAX_PAGE_SIZE)

    .default(WORKSPACE_LIST_DEFAULT_PAGE_SIZE),

  q: z.string().trim().max(200).optional().default(""),

  semester: z.string().trim().max(120).optional().default(""),

  status: z
    .enum(["ALL", "DRAFT", "ACTIVE", "INACTIVE"])
    .default("ALL"),

  sortBy: z.enum(WORKSPACE_LIST_SORT_FIELDS).default("updatedAt"),

  sortDir: z.enum(["asc", "desc"]).default("desc"),

  trash: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true")
    .default(false),

});



export const workspaceCreateSchema = z.object({

  name: z

    .string()

    .trim()

    .min(

      WORKSPACE_NAME_MIN,

      `Workspace name must be at least ${WORKSPACE_NAME_MIN} characters`,

    )

    .max(

      WORKSPACE_NAME_MAX,

      `Workspace name must be at most ${WORKSPACE_NAME_MAX} characters`,

    ),

  className: z

    .string()

    .trim()

    .min(WORKSPACE_CLASS_NAME_MIN, "Class name is required")

    .max(

      WORKSPACE_CLASS_NAME_MAX,

      `Class name must be at most ${WORKSPACE_CLASS_NAME_MAX} characters`,

    ),

  semester: z.string().trim().min(1, "Semester is required"),

  description: z.string().optional().nullable(),

  status: workspaceStatusSchema.optional().default("DRAFT"),

});



export const workspaceUpdateSchema = z

  .object({

    name: z

      .string()

      .trim()

      .min(

        WORKSPACE_NAME_MIN,

        `Workspace name must be at least ${WORKSPACE_NAME_MIN} characters`,

      )

      .max(

        WORKSPACE_NAME_MAX,

        `Workspace name must be at most ${WORKSPACE_NAME_MAX} characters`,

      )

      .optional(),

    className: z

      .string()

      .trim()

      .min(WORKSPACE_CLASS_NAME_MIN, "Class name is required")

      .max(

        WORKSPACE_CLASS_NAME_MAX,

        `Class name must be at most ${WORKSPACE_CLASS_NAME_MAX} characters`,

      )

      .optional(),

    semester: z.string().trim().min(1, "Semester is required").optional(),

    description: z.string().nullable().optional(),

    status: workspaceStatusSchema.optional(),

  })

  .refine(

    (value) =>

      value.name !== undefined ||

      value.className !== undefined ||

      value.semester !== undefined ||

      value.description !== undefined ||

      value.status !== undefined,

    { message: "Provide at least one field to update" },

  );



export type WorkspaceCreateInput = z.infer<typeof workspaceCreateSchema>;

export type WorkspaceUpdateInput = z.infer<typeof workspaceUpdateSchema>;

export type WorkspaceListQueryInput = z.infer<typeof workspaceListQuerySchema>;



export { WORKSPACE_DESCRIPTION_MAX_PLAIN };


