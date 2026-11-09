import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "@/db/schema/auth";
import { portfolioDocumentRoleEnum, portfolioStatusEnum } from "@/db/schema/enums";
import { assignment, assignmentGroup, workspace } from "@/db/schema/workspaces";

export const portfolio = pgTable(
  "portfolio",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").references(() => workspace.id, {
      onDelete: "set null",
    }),
    assignmentId: text("assignment_id").references(() => assignment.id, {
      onDelete: "set null",
    }),
    submittedById: text("submitted_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    groupId: text("group_id").references(() => assignmentGroup.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    demoUrl: text("demo_url"),
    videoUrl: text("video_url"),
    sourceUrl: text("source_url"),
    workspaceName: text("workspace_name"),
    className: text("class_name"),
    semesterLabel: text("semester_label"),
    submissionTitle: text("submission_title"),
    lecturerName: text("lecturer_name"),
    campus: text("campus"),
    major: text("major"),
    batch: text("batch"),
    academicSemester: text("academic_semester"),
    status: portfolioStatusEnum("status").default("DRAFT").notNull(),
    grade: integer("grade"),
    feedback: text("feedback"),
    verifiedById: text("verified_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    verifiedAt: timestamp("verified_at"),
    publishedAt: timestamp("published_at"),
    technologyTags: text("technology_tags").array(),
    youtubeUrl: text("youtube_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("portfolio_workspace_id_idx").on(table.workspaceId),
    index("portfolio_assignment_id_idx").on(table.assignmentId),
    index("portfolio_submitted_by_id_idx").on(table.submittedById),
    index("portfolio_status_idx").on(table.status),
    index("portfolio_verified_by_id_idx").on(table.verifiedById),
    uniqueIndex("portfolio_individual_uidx")
      .on(table.assignmentId, table.submittedById)
      .where(sql`${table.groupId} is null and ${table.assignmentId} is not null`),
    uniqueIndex("portfolio_group_uidx")
      .on(table.assignmentId, table.groupId)
      .where(sql`${table.groupId} is not null and ${table.assignmentId} is not null`),
  ],
);

export const portfolioImage = pgTable(
  "portfolio_image",
  {
    id: text("id").primaryKey(),
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => portfolio.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    url: text("url").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    isPoster: boolean("is_poster").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("portfolio_image_portfolio_id_idx").on(table.portfolioId)],
);

export const portfolioDocument = pgTable(
  "portfolio_document",
  {
    id: text("id").primaryKey(),
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => portfolio.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    url: text("url").notNull(),
    fileName: text("file_name").notNull(),
    role: portfolioDocumentRoleEnum("role").default("ADDITIONAL").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("portfolio_document_portfolio_id_idx").on(table.portfolioId),
    index("portfolio_document_role_idx").on(table.portfolioId, table.role),
  ],
);

export const portfolioVideo = pgTable(
  "portfolio_video",
  {
    id: text("id").primaryKey(),
    portfolioId: text("portfolio_id")
      .notNull()
      .unique()
      .references(() => portfolio.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    url: text("url").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    durationSeconds: integer("duration_seconds"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("portfolio_video_portfolio_id_idx").on(table.portfolioId)],
);

export const portfolioLink = pgTable(
  "portfolio_link",
  {
    id: text("id").primaryKey(),
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => portfolio.id, { onDelete: "cascade" }),
    label: text("label"),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("portfolio_link_portfolio_id_idx").on(table.portfolioId)],
);

export const portfolioContributor = pgTable(
  "portfolio_contributor",
  {
    id: text("id").primaryKey(),
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => portfolio.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("portfolio_contributor_portfolio_id_idx").on(table.portfolioId),
    index("portfolio_contributor_user_id_idx").on(table.userId),
    uniqueIndex("portfolio_contributor_uidx").on(table.portfolioId, table.userId),
  ],
);
