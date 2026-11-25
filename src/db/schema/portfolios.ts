import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
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
  portfolioDocumentRoleEnum,
  portfolioEventActorRoleEnum,
  portfolioEventTypeEnum,
  portfolioScoreDecisionEnum,
  portfolioScoringModeEnum,
  portfolioStatusEnum,
  projectEmailOutboxStatusEnum,
  projectEmailTemplateEnum,
} from "@/db/schema/enums";
import {
  assignment,
  assignmentGroup,
  assignmentRubricComponent,
  workspace,
} from "@/db/schema/workspaces";

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
    index("portfolio_workspace_status_idx").on(table.workspaceId, table.status),
    index("portfolio_assignment_status_idx").on(table.assignmentId, table.status),
    uniqueIndex("portfolio_individual_uidx")
      .on(table.assignmentId, table.submittedById)
      .where(sql`${table.groupId} is null and ${table.assignmentId} is not null`),
    uniqueIndex("portfolio_group_uidx")
      .on(table.assignmentId, table.groupId)
      .where(sql`${table.groupId} is not null and ${table.assignmentId} is not null`),
  ],
);

export const portfolioEvent = pgTable(
  "portfolio_event",
  {
    id: text("id").primaryKey(),
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => portfolio.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    actorRole: portfolioEventActorRoleEnum("actor_role").notNull(),
    eventType: portfolioEventTypeEnum("event_type").notNull(),
    fromStatus: portfolioStatusEnum("from_status"),
    toStatus: portfolioStatusEnum("to_status"),
    grade: integer("grade"),
    feedback: text("feedback"),
    message: text("message").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("portfolio_event_portfolio_id_idx").on(table.portfolioId),
    index("portfolio_event_created_at_idx").on(table.portfolioId, table.createdAt),
    index("portfolio_event_type_idx").on(table.eventType),
  ],
);

export const projectEmailOutbox = pgTable(
  "project_email_outbox",
  {
    id: text("id").primaryKey(),
    portfolioId: text("portfolio_id").references(() => portfolio.id, {
      onDelete: "set null",
    }),
    workspaceId: text("workspace_id").references(() => workspace.id, {
      onDelete: "set null",
    }),
    recipient: text("recipient").notNull(),
    template: projectEmailTemplateEnum("template").notNull(),
    status: projectEmailOutboxStatusEnum("status").default("PENDING").notNull(),
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
    index("project_email_outbox_status_idx").on(table.status),
    index("project_email_outbox_portfolio_id_idx").on(table.portfolioId),
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

export const portfolioScoreSheet = pgTable(
  "portfolio_score_sheet",
  {
    id: text("id").primaryKey(),
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => portfolio.id, { onDelete: "cascade" }),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignment.id, { onDelete: "cascade" }),
    decision: portfolioScoreDecisionEnum("decision").notNull(),
    scoringMode: portfolioScoringModeEnum("scoring_mode").notNull(),
    groupPercent: integer("group_percent").default(100).notNull(),
    individualPercent: integer("individual_percent").default(0).notNull(),
    groupTotal: integer("group_total").notNull(),
    finalGrade: integer("final_grade"),
    groupFeedback: text("group_feedback"),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("portfolio_score_sheet_portfolio_id_idx").on(table.portfolioId),
    index("portfolio_score_sheet_assignment_id_idx").on(table.assignmentId),
    index("portfolio_score_sheet_created_at_idx").on(table.portfolioId, table.createdAt),
  ],
);

export const portfolioScoreComponent = pgTable(
  "portfolio_score_component",
  {
    id: text("id").primaryKey(),
    sheetId: text("sheet_id")
      .notNull()
      .references(() => portfolioScoreSheet.id, { onDelete: "cascade" }),
    // Explicit short FK name: auto name exceeds Postgres 63-char limit and
    // truncates, which makes drizzle-kit push loop on rename forever.
    rubricComponentId: text("rubric_component_id").notNull(),
    score: integer("score").notNull(),
    maxPoints: integer("max_points").notNull(),
    weightPercent: integer("weight_percent").notNull(),
    componentName: text("component_name").notNull(),
    componentDescription: text("component_description"),
  },
  (table) => [
    foreignKey({
      name: "portfolio_score_comp_rubric_fk",
      columns: [table.rubricComponentId],
      foreignColumns: [assignmentRubricComponent.id],
    }).onDelete("restrict"),
    index("portfolio_score_component_sheet_id_idx").on(table.sheetId),
    uniqueIndex("portfolio_score_component_sheet_rubric_uidx").on(
      table.sheetId,
      table.rubricComponentId,
    ),
  ],
);

export const portfolioMemberScore = pgTable(
  "portfolio_member_score",
  {
    id: text("id").primaryKey(),
    sheetId: text("sheet_id")
      .notNull()
      .references(() => portfolioScoreSheet.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Sum of per-member rubric component scores (GROUP_AND_INDIVIDUAL); null otherwise. */
    individualScore: integer("individual_score"),
    finalGrade: integer("final_grade").notNull(),
    /** @deprecated Unused — feedback lives on the score sheet / portfolio. Kept nullable for history. */
    notes: text("notes"),
  },
  (table) => [
    index("portfolio_member_score_sheet_id_idx").on(table.sheetId),
    uniqueIndex("portfolio_member_score_sheet_user_uidx").on(table.sheetId, table.userId),
  ],
);

/** Per-student rubric component scores when scoring mode is GROUP_AND_INDIVIDUAL. */
export const portfolioMemberComponentScore = pgTable(
  "portfolio_member_component_score",
  {
    id: text("id").primaryKey(),
    // Short explicit FK names — auto names exceed Postgres 63-char limit and
    // make drizzle-kit push loop on rename (same class of bug as 0018).
    sheetId: text("sheet_id").notNull(),
    userId: text("user_id").notNull(),
    rubricComponentId: text("rubric_component_id").notNull(),
    score: integer("score").notNull(),
    maxPoints: integer("max_points").notNull(),
    weightPercent: integer("weight_percent").notNull(),
    componentName: text("component_name").notNull(),
    componentDescription: text("component_description"),
  },
  (table) => [
    foreignKey({
      name: "portfolio_member_comp_sheet_fk",
      columns: [table.sheetId],
      foreignColumns: [portfolioScoreSheet.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "portfolio_member_comp_user_fk",
      columns: [table.userId],
      foreignColumns: [user.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "portfolio_member_comp_rubric_fk",
      columns: [table.rubricComponentId],
      foreignColumns: [assignmentRubricComponent.id],
    }).onDelete("restrict"),
    index("portfolio_member_comp_sheet_idx").on(table.sheetId),
    index("portfolio_member_comp_user_idx").on(table.sheetId, table.userId),
    uniqueIndex("portfolio_member_comp_uidx").on(
      table.sheetId,
      table.userId,
      table.rubricComponentId,
    ),
  ],
);
