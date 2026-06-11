import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "@/db/schema/auth";
import { portfolioStatusEnum } from "@/db/schema/enums";
import { assignment, assignmentGroup, workspace } from "@/db/schema/workspaces";

export const portfolio = pgTable(
  "portfolio",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignment.id, { onDelete: "cascade" }),
    submittedById: text("submitted_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    groupId: text("group_id").references(() => assignmentGroup.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
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
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("portfolio_document_portfolio_id_idx").on(table.portfolioId),
  ],
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
  ],
);
