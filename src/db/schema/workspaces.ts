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
import {
  assignmentTypeEnum,
  groupAssignmentMethodEnum,
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
    uniqueIndex("workspace_unique_class_idx").on(
      table.lecturerId,
      table.name,
      table.className,
      table.semester,
    ),
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
    joinedAt: timestamp("joined_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("workspace_member_workspace_id_idx").on(table.workspaceId),
    index("workspace_member_user_id_idx").on(table.userId),
    uniqueIndex("workspace_member_unique_idx").on(
      table.workspaceId,
      table.userId,
    ),
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
