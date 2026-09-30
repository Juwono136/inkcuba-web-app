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

export const directoryOptionCategoryEnum = pgEnum("directory_option_category", [
  "campus",
  "major",
  "batch",
  "semester",
  "department",
]);
