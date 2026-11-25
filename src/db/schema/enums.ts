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
  "SUBMITTED",
  "IN_REVIEW",
  "NEED_REVISION",
  "REVISED",
  "PUBLISHED",
  "TAKEN_DOWN",
]);

export const portfolioDocumentRoleEnum = pgEnum("portfolio_document_role", [
  "PROJECT",
  "ADDITIONAL",
]);

export const portfolioEventActorRoleEnum = pgEnum("portfolio_event_actor_role", [
  "STUDENT",
  "LECTURER",
  "SYSTEM",
]);

export const portfolioEventTypeEnum = pgEnum("portfolio_event_type", [
  "CREATED",
  "SUBMITTED",
  "REVIEW_STARTED",
  "REVISION_REQUESTED",
  "RESUBMITTED",
  "PUBLISHED",
  "ARCHIVED",
  "UNARCHIVED",
  "DELETED",
]);

export const projectEmailTemplateEnum = pgEnum("project_email_template", [
  "PROJECT_SUBMITTED_STUDENT",
  "PROJECT_SUBMITTED_LECTURER",
  "PROJECT_REVISION_REQUESTED",
  "PROJECT_PUBLISHED",
]);

export const projectEmailOutboxStatusEnum = pgEnum("project_email_outbox_status", [
  "PENDING",
  "SENT",
  "FAILED",
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

export const assignmentStatusEnum = pgEnum("assignment_status", [
  "DRAFT",
  "ACTIVE",
  "CLOSED",
]);

export const assignmentScheduleModeEnum = pgEnum("assignment_schedule_mode", [
  "OPEN",
  "WINDOW",
]);

export const portfolioScoreDecisionEnum = pgEnum("portfolio_score_decision", [
  "PUBLISH",
  "REVISION",
]);

export const portfolioScoringModeEnum = pgEnum("portfolio_scoring_mode", [
  "INDIVIDUAL",
  "GROUP_ONLY",
  "GROUP_AND_INDIVIDUAL",
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

export const workspaceMemberSourceEnum = pgEnum("workspace_member_source", [
  "MANUAL",
  "EXCEL",
  "LINK",
  "CODE",
]);

export const workspaceImportJobStatusEnum = pgEnum(
  "workspace_import_job_status",
  [
    "UPLOADED",
    "PARSING",
    "READY",
    "COMMITTING",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
  ],
);

export const workspaceImportItemStatusEnum = pgEnum(
  "workspace_import_item_status",
  ["PENDING", "SKIPPED", "SUCCESS", "FAILED"],
);

export const workspaceInvitationPurposeEnum = pgEnum(
  "workspace_invitation_purpose",
  ["INVITE_EXISTING", "INVITE_ACTIVATE"],
);

export const workspaceEmailOutboxStatusEnum = pgEnum(
  "workspace_email_outbox_status",
  ["PENDING", "SENT", "FAILED"],
);

export const workspaceEmailTemplateEnum = pgEnum(
  "workspace_email_template",
  [
    "INVITE_EXISTING",
    "INVITE_REGISTERED_NO_LOGIN",
    "INVITE_ACTIVATE",
    "WORKSPACE_JOINED",
  ],
);

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
