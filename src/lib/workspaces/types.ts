export const WORKSPACE_NAME_MIN = 2;
export const WORKSPACE_NAME_MAX = 120;
export const WORKSPACE_CLASS_NAME_MIN = 1;
export const WORKSPACE_CLASS_NAME_MAX = 80;
export const WORKSPACE_DESCRIPTION_MAX_PLAIN = 8000;

export const WORKSPACE_STATUSES = ["DRAFT", "ACTIVE", "INACTIVE"] as const;

export type WorkspaceStatus = (typeof WORKSPACE_STATUSES)[number];

export const WORKSPACE_STATUS_LABELS: Record<WorkspaceStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

export const WORKSPACE_STATUS_HINTS: Record<WorkspaceStatus, string> = {
  DRAFT: "Prepare privately. Students cannot access this workspace yet.",
  ACTIVE: "Open to enrolled students for people, submissions, and scoring.",
  INACTIVE: "Closed. Students cannot access this workspace.",
};

/** Students may only enter workspaces that are explicitly Active. */
export function isWorkspaceOpenToStudents(status: WorkspaceStatus): boolean {
  return status === "ACTIVE";
}

export type WorkspaceRecord = {
  id: string;
  lecturerId: string;
  name: string;
  className: string;
  semester: string;
  semesterLabel: string;
  description: string | null;
  backgroundImageKey: string | null;
  backgroundImageUrl: string | null;
  inviteCode: string;
  status: WorkspaceStatus;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceLecturerInfo = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  campus: string | null;
  campusLabel: string | null;
  major: string | null;
  majorLabel: string | null;
  department: string | null;
  departmentLabel: string | null;
  title: string | null;
  nidn: string | null;
  binusianId: string | null;
};

export type WorkspaceDetail = WorkspaceRecord & {
  lecturer: WorkspaceLecturerInfo;
};

export type WorkspaceListPage = {
  items: WorkspaceRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const WORKSPACE_LIST_SORT_FIELDS = [
  "updatedAt",
  "createdAt",
  "name",
  "className",
  "semester",
] as const;

export type WorkspaceListSortField =
  (typeof WORKSPACE_LIST_SORT_FIELDS)[number];

export type WorkspaceListStatusFilter = "ALL" | WorkspaceStatus;

export type WorkspaceListQuery = {
  page: number;
  pageSize: number;
  q: string;
  semester: string;
  status: WorkspaceListStatusFilter;
  sortBy: WorkspaceListSortField;
  sortDir: "asc" | "desc";
};

export const WORKSPACE_LIST_DEFAULT_PAGE_SIZE = 12;
export const WORKSPACE_LIST_MAX_PAGE_SIZE = 48;
