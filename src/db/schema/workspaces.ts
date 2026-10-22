import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "@/db/schema/auth";
import {
  assignmentTypeEnum,
  groupAssignmentMethodEnum,
  workspaceEmailOutboxStatusEnum,
  workspaceEmailTemplateEnum,
  workspaceImportItemStatusEnum,
  workspaceImportJobStatusEnum,
  workspaceInvitationPurposeEnum,
  workspaceMemberSourceEnum,
  workspaceMemberStatusEnum,
  workspaceStatusEnum,
} from "@/db/schema/enums";

export const workspace = pgTable(
  "workspace",
  {
    id: text("id").primaryKey(),
    lecturerId: text("lecturer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    className: text("class_name").notNull(),
    semester: text("semester").notNull(),
    description: text("description"),
    backgroundImageKey: text("background_image_key"),
    backgroundImageUrl: text("background_image_url"),
    inviteCode: text("invite_code").notNull().unique(),
    status: workspaceStatusEnum("status").default("DRAFT").notNull(),
    /** Soft-delete / trash marker. Null = active record (not in trash). */
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("workspace_lecturer_id_idx").on(table.lecturerId),
    index("workspace_semester_idx").on(table.semester),
    index("workspace_status_idx").on(table.status),
    index("workspace_deleted_at_idx").on(table.deletedAt),
    // Partial unique: soft-deleted rows do not block recreating the same class.
    uniqueIndex("workspace_unique_class_idx")
      .on(table.lecturerId, table.name, table.className, table.semester)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const workspaceMember = pgTable(
  "workspace_member",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: workspaceMemberStatusEnum("status").default("INVITED").notNull(),
    source: workspaceMemberSourceEnum("source").default("MANUAL").notNull(),
    invitedBy: text("invited_by").references(() => user.id, {
      onDelete: "set null",
    }),
    invitedAt: timestamp("invited_at"),
    joinedAt: timestamp("joined_at"),
    removedAt: timestamp("removed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("workspace_member_workspace_id_idx").on(table.workspaceId),
    index("workspace_member_user_id_idx").on(table.userId),
    index("workspace_member_status_idx").on(table.status),
    uniqueIndex("workspace_member_unique_idx").on(
      table.workspaceId,
      table.userId,
    ),
  ],
);

export type WorkspaceImportItemPayload = {
  name: string;
  nim: string;
  email: string;
  majorLabel: string;
  majorValue: string | null;
  batchLabel: string;
  batchValue: string | null;
};

export type WorkspaceImportItemValidation = {
  errors: string[];
  warnings: string[];
  matchType:
    | "EXISTING_USER"
    | "NEW_USER"
    | "DUPLICATE_ROW"
    | "ALREADY_MEMBER"
    | "INVALID";
};

export const workspaceImportJob = pgTable(
  "workspace_import_job",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    lecturerId: text("lecturer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: workspaceImportJobStatusEnum("status")
      .default("UPLOADED")
      .notNull(),
    fileKey: text("file_key"),
    fileName: text("file_name"),
    fileSha256: text("file_sha256"),
    rowCount: integer("row_count").default(0).notNull(),
    validCount: integer("valid_count").default(0).notNull(),
    errorCount: integer("error_count").default(0).notNull(),
    processedCount: integer("processed_count").default(0).notNull(),
    idempotencyKey: text("idempotency_key"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    committedAt: timestamp("committed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("workspace_import_job_workspace_id_idx").on(table.workspaceId),
    index("workspace_import_job_lecturer_id_idx").on(table.lecturerId),
    index("workspace_import_job_status_idx").on(table.status),
    uniqueIndex("workspace_import_job_idempotency_idx").on(
      table.workspaceId,
      table.idempotencyKey,
    ),
  ],
);

export const workspaceImportJobItem = pgTable(
  "workspace_import_job_item",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => workspaceImportJob.id, { onDelete: "cascade" }),
    rowIndex: integer("row_index").notNull(),
    payload: jsonb("payload").$type<WorkspaceImportItemPayload>().notNull(),
    validation: jsonb("validation")
      .$type<WorkspaceImportItemValidation>()
      .notNull(),
    resolvedUserId: text("resolved_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    status: workspaceImportItemStatusEnum("status")
      .default("PENDING")
      .notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("workspace_import_job_item_job_id_idx").on(table.jobId),
    uniqueIndex("workspace_import_job_item_row_idx").on(
      table.jobId,
      table.rowIndex,
    ),
  ],
);

export const workspaceInvitationToken = pgTable(
  "workspace_invitation_token",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    memberId: text("member_id").references(() => workspaceMember.id, {
      onDelete: "set null",
    }),
    tokenHash: text("token_hash").notNull(),
    purpose: workspaceInvitationPurposeEnum("purpose").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("workspace_invitation_token_hash_idx").on(table.tokenHash),
    index("workspace_invitation_token_user_idx").on(table.userId),
    index("workspace_invitation_token_workspace_idx").on(table.workspaceId),
  ],
);

export const workspaceEmailOutbox = pgTable(
  "workspace_email_outbox",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").references(() => workspaceImportJob.id, {
      onDelete: "set null",
    }),
    memberId: text("member_id").references(() => workspaceMember.id, {
      onDelete: "set null",
    }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    recipient: text("recipient").notNull(),
    template: workspaceEmailTemplateEnum("template").notNull(),
    status: workspaceEmailOutboxStatusEnum("status")
      .default("PENDING")
      .notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastError: text("last_error"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("workspace_email_outbox_workspace_id_idx").on(table.workspaceId),
    index("workspace_email_outbox_status_idx").on(table.status),
  ],
);

export const assignment = pgTable(
  "assignment",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    type: assignmentTypeEnum("type").default("INDIVIDUAL").notNull(),
    groupMethod: groupAssignmentMethodEnum("group_method"),
    maxGroupSize: integer("max_group_size"),
    dueDate: timestamp("due_date"),
    isPublished: boolean("is_published").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("assignment_workspace_id_idx").on(table.workspaceId),
    index("assignment_due_date_idx").on(table.dueDate),
  ],
);

export const assignmentGroup = pgTable(
  "assignment_group",
  {
    id: text("id").primaryKey(),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignment.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    inviteCode: text("invite_code").unique(),
    maxMembers: integer("max_members").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("assignment_group_assignment_id_idx").on(table.assignmentId)],
);

export const assignmentGroupMember = pgTable(
  "assignment_group_member",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => assignmentGroup.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isLeader: boolean("is_leader").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("assignment_group_member_group_id_idx").on(table.groupId),
    index("assignment_group_member_user_id_idx").on(table.userId),
    uniqueIndex("assignment_group_member_unique_idx").on(
      table.groupId,
      table.userId,
    ),
  ],
);
