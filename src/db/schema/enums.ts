import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "STUDENT",
  "LECTURER",
  "ADMIN",
]);

export const portfolioStatusEnum = pgEnum("portfolio_status", [
  "DRAFT",
  "PENDING_REVIEW",
  "REVISION_REQUIRED",
  "APPROVED",
  "TAKEDOWN",
  "ARCHIVED",
]);

export const assignmentTypeEnum = pgEnum("assignment_type", [
  "INDIVIDUAL",
  "GROUP",
]);

export const groupAssignmentMethodEnum = pgEnum("group_assignment_method", [
  "RANDOM",
  "MANUAL",
  "SELF_SELECT",
]);

export const workspaceMemberStatusEnum = pgEnum("workspace_member_status", [
  "INVITED",
  "ACTIVE",
  "REMOVED",
]);

/** Lecturer-managed lifecycle for a class workspace. Only ACTIVE is open to students. */
export const workspaceStatusEnum = pgEnum("workspace_status", [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
]);

export const directoryOptionCategoryEnum = pgEnum("directory_option_category", [
  "campus",
  "major",
  "batch",
  "semester",
  "department",
]);

/** Identity fields that can be toggled as self-editable per role in My Settings. */
export const settingsIdentityFieldEnum = pgEnum("settings_identity_field", [
  "name",
  "title",
  "campus",
  "nim",
  "nidn",
  "major",
  "batch",
  "semester",
  "department",
]);
