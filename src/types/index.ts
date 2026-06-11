export type PortfolioStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "REVISION_REQUIRED"
  | "APPROVED"
  | "TAKEDOWN"
  | "ARCHIVED";

export type AssignmentType = "INDIVIDUAL" | "GROUP";

export type GroupAssignmentMethod = "RANDOM" | "MANUAL" | "SELF_SELECT";

export type WorkspaceMemberStatus = "INVITED" | "ACTIVE" | "REMOVED";
