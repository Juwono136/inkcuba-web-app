export const WORKSPACE_MEMBER_SOURCES = [
  "MANUAL",
  "EXCEL",
  "LINK",
  "CODE",
] as const;

export type WorkspaceMemberSource =
  (typeof WORKSPACE_MEMBER_SOURCES)[number];

export const WORKSPACE_MEMBER_STATUSES = [
  "INVITED",
  "ACTIVE",
  "REMOVED",
] as const;

export type WorkspaceMemberStatus =
  (typeof WORKSPACE_MEMBER_STATUSES)[number];

export type WorkspaceMemberUser = {
  id: string;
  name: string;
  email: string;
  nim: string | null;
  image: string | null;
  major: string | null;
  majorLabel: string | null;
  batch: string | null;
  batchLabel: string | null;
  hasLoggedIn: boolean;
};

export type WorkspaceMemberRecord = {
  id: string;
  workspaceId: string;
  userId: string;
  status: WorkspaceMemberStatus;
  source: WorkspaceMemberSource;
  invitedBy: string | null;
  invitedAt: string | null;
  joinedAt: string | null;
  removedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: WorkspaceMemberUser;
};

export type WorkspaceMemberListPage = {
  items: WorkspaceMemberRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type WorkspaceCandidate = {
  id: string;
  name: string;
  email: string;
  nim: string | null;
  image: string | null;
  majorLabel: string | null;
};

export type WorkspaceCandidatePage = {
  items: WorkspaceCandidate[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ImportItemMatchType =
  | "EXISTING_USER"
  | "NEW_USER"
  | "DUPLICATE_ROW"
  | "ALREADY_MEMBER"
  | "INVALID";

export type WorkspaceImportItemRecord = {
  id: string;
  jobId: string;
  rowIndex: number;
  name: string;
  nim: string;
  email: string;
  majorLabel: string;
  majorValue: string | null;
  batchLabel: string;
  batchValue: string | null;
  errors: string[];
  warnings: string[];
  matchType: ImportItemMatchType;
  status: "PENDING" | "SKIPPED" | "SUCCESS" | "FAILED";
  resolvedUserId: string | null;
  errorMessage: string | null;
};

export type WorkspaceImportJobRecord = {
  id: string;
  workspaceId: string;
  status:
    | "UPLOADED"
    | "PARSING"
    | "READY"
    | "COMMITTING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED";
  fileName: string | null;
  rowCount: number;
  validCount: number;
  errorCount: number;
  processedCount: number;
  committedAt: string | null;
  createdAt: string;
  updatedAt: string;
  canCommit: boolean;
};

export const WORKSPACE_MEMBERS_DEFAULT_PAGE_SIZE = 12;
export const WORKSPACE_MEMBERS_MAX_PAGE_SIZE = 100;
export const WORKSPACE_CANDIDATES_PAGE_SIZE = 20;
export const WORKSPACE_MANUAL_ADD_MAX = 50;
export const WORKSPACE_IMPORT_MAX_BYTES = 5 * 1024 * 1024;

/** Lowercase letters + digits only, exactly 8 characters. */
export const INVITE_CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
export const INVITE_CODE_LENGTH = 8;
export const INVITE_CODE_PATTERN = /^[a-z0-9]{8}$/;

export function normalizeWorkspaceInviteCode(code: string): string {
  return code.trim().toLowerCase();
}

export function isValidWorkspaceInviteCode(code: string): boolean {
  return INVITE_CODE_PATTERN.test(normalizeWorkspaceInviteCode(code));
}
