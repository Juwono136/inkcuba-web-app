export {
  listLecturerWorkspaces,
  getLecturerWorkspaceDetail,
  createLecturerWorkspace,
  updateLecturerWorkspace,
  deleteLecturerWorkspace,
  softDeleteLecturerWorkspace,
  restoreLecturerWorkspace,
  hardDeleteLecturerWorkspace,
  pruneExpiredSoftDeletedWorkspaces,
  setWorkspaceBackground,
  removeWorkspaceBackground,
  uploadDescriptionImageForWorkspace,
  uploadTmpDescriptionImage,
  assertStudentCanAccessWorkspace,
  assertStudentCanAccessWorkspaceByInviteCode,
} from "@/lib/workspaces/service";
export { WORKSPACE_SOFT_DELETE_RETENTION_DAYS } from "@/lib/workspaces/constants";
export type {
  WorkspaceRecord,
  WorkspaceDetail,
  WorkspaceListPage,
  WorkspaceLecturerInfo,
  WorkspaceListQuery,
  WorkspaceListSortField,
  WorkspaceStatus,
  WorkspaceListStatusFilter,
} from "@/lib/workspaces/types";
export {
  WORKSPACE_STATUSES,
  WORKSPACE_STATUS_LABELS,
  WORKSPACE_STATUS_HINTS,
  isWorkspaceOpenToStudents,
} from "@/lib/workspaces/types";
export {
  workspaceCreateSchema,
  workspaceUpdateSchema,
  workspaceListQuerySchema,
  workspaceStatusSchema,
  type WorkspaceCreateInput,
  type WorkspaceUpdateInput,
  type WorkspaceListQueryInput,
} from "@/lib/workspaces/validators";
export { requireLecturerApi } from "@/lib/workspaces/require-lecturer-api";
