export const SUBMISSION_STATUSES = ["DRAFT", "ACTIVE", "CLOSED"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const SUBMISSION_TYPES = ["INDIVIDUAL", "GROUP"] as const;
export type SubmissionType = (typeof SUBMISSION_TYPES)[number];

export const SUBMISSION_GROUP_METHODS = ["RANDOM", "SELF_SELECT"] as const;
export type SubmissionGroupMethod = (typeof SUBMISSION_GROUP_METHODS)[number];

export const SUBMISSION_SCHEDULE_MODES = ["OPEN", "WINDOW"] as const;
export type SubmissionScheduleMode = (typeof SUBMISSION_SCHEDULE_MODES)[number];

export const SUBMISSION_WINDOW_STATES = [
  "ALWAYS",
  "OPEN",
  "UPCOMING",
  "ENDED",
] as const;
export type SubmissionWindowState = (typeof SUBMISSION_WINDOW_STATES)[number];

export const SUBMISSION_TITLE_MIN = 3;
export const SUBMISSION_TITLE_MAX = 120;
export const SUBMISSION_DESCRIPTION_MAX_PLAIN = 2500;
export const SUBMISSION_DESCRIPTION_MAX_HTML = 20_000;
export const SUBMISSION_SCORE_MIN = 1;
export const SUBMISSION_SCORE_MAX = 1000;
export const SUBMISSION_GROUP_SIZE_MIN = 2;
export const SUBMISSION_GROUP_SIZE_MAX = 20;
/** Empty groups created in one confirmed request. */
export const SUBMISSION_GROUP_ADD_MAX = 50;
/** Hard cap so one submission cannot grow without bound. */
export const SUBMISSION_GROUP_TOTAL_MAX = 200;
export const SUBMISSION_LIST_DEFAULT_PAGE_SIZE = 12;
export const SUBMISSION_LIST_MAX_PAGE_SIZE = 48;
export const SUBMISSION_GROUP_PAGE_SIZE = 6;

export const SUBMISSION_SORT_FIELDS = [
  "updatedAt",
  "title",
  "opensAt",
  "maxScore",
  "status",
] as const;
export type SubmissionSortField = (typeof SUBMISSION_SORT_FIELDS)[number];

export const SUBMISSION_SORT_LABELS: Record<SubmissionSortField, string> = {
  updatedAt: "Last updated",
  title: "Title",
  opensAt: "Opening date",
  maxScore: "Maximum score",
  status: "Status",
};

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  CLOSED: "Closed",
};

export const SUBMISSION_TYPE_LABELS: Record<SubmissionType, string> = {
  INDIVIDUAL: "Individual",
  GROUP: "Group",
};

export type SubmissionRecord = {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  type: SubmissionType;
  groupMethod: SubmissionGroupMethod | null;
  maxGroupSize: number | null;
  maxScore: number;
  scheduleMode: SubmissionScheduleMode;
  opensAt: string | null;
  closesAt: string | null;
  status: SubmissionStatus;
  windowState: SubmissionWindowState;
  createdAt: string;
  updatedAt: string;
};

export type SubmissionListPage = {
  items: SubmissionRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type SubmissionCurrentCard = {
  submission: SubmissionRecord | null;
  activeCount: number;
};

export type SubmissionMember = {
  userId: string;
  name: string;
  email: string;
  nim: string | null;
  image: string | null;
};

export type SubmissionGroupCard = {
  id: string;
  name: string;
  maxMembers: number;
  memberCount: number;
  /** A student project already exists for this group. */
  projectStarted: boolean;
  members: SubmissionMember[];
};

export type SubmissionGroupPage = {
  items: SubmissionGroupCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type SubmissionGroupOption = {
  id: string;
  name: string;
  memberCount: number;
  maxMembers: number;
  projectStarted: boolean;
};

export type SubmissionGroupsPayload = {
  assignmentId: string;
  type: SubmissionType;
  status: SubmissionStatus;
  groupMethod: SubmissionGroupMethod | null;
  maxGroupSize: number | null;
  activeStudentCount: number;
  seatCapacity: number;
  groups: SubmissionGroupPage;
  unassigned: SubmissionGroupPage;
  groupOptions: SubmissionGroupOption[];
};

export type SubmissionPrepareState = {
  canPrepare: boolean;
  canSubmitLater: boolean;
  blockedReason: string | null;
  myGroup: SubmissionGroupCard | null;
};

export function submissionWindowState(input: {
  scheduleMode: SubmissionScheduleMode;
  opensAt: string | Date | null;
  closesAt: string | Date | null;
  now?: Date;
}): SubmissionWindowState {
  if (input.scheduleMode === "OPEN") return "ALWAYS";
  const opens = toDate(input.opensAt);
  const closes = toDate(input.closesAt);
  if (!opens || !closes) return "ENDED";
  const now = input.now ?? new Date();
  if (now < opens) return "UPCOMING";
  if (now > closes) return "ENDED";
  return "OPEN";
}

function toDate(value: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function groupSlotCount(studentCount: number, maxGroupSize: number): number {
  if (studentCount <= 0) return 1;
  return Math.max(1, Math.ceil(studentCount / maxGroupSize));
}

/** Sizes differ by at most one and never exceed maxGroupSize. */
export function evenGroupSizes(
  studentCount: number,
  groupCount: number,
): number[] {
  if (groupCount <= 0) return [];
  if (studentCount <= 0) return Array.from({ length: groupCount }, () => 0);
  const base = Math.floor(studentCount / groupCount);
  const extra = studentCount % groupCount;
  return Array.from(
    { length: groupCount },
    (_, index) => base + (index < extra ? 1 : 0),
  );
}
