export const PROJECT_TITLE_MIN = 3;
export const PROJECT_TITLE_MAX = 120;
export const PROJECT_DESCRIPTION_MAX_PLAIN = 5000;
export const PROJECT_DESCRIPTION_MAX_HTML = 20_000;
export const PROJECT_IMAGE_MIN = 1;
export const PROJECT_IMAGE_MAX = 3;
export const PROJECT_IMAGE_MAX_BYTES = 12 * 1024 * 1024;
export const PROJECT_IMAGE_MAX_EDGE = 4096;
export const PROJECT_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const PROJECT_VIDEO_MAX_SECONDS = 180;
export const PROJECT_DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;
export const PROJECT_ADDITIONAL_DOC_MAX = 3;
export const PROJECT_OTHER_LINK_MAX = 3;
export const PROJECT_LINK_LABEL_MAX = 40;

export const PROJECT_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "NEED_REVISION",
  "REVISED",
  "PUBLISHED",
  "TAKEN_DOWN",
  "ARCHIVED",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  IN_REVIEW: "In review",
  NEED_REVISION: "Need revision",
  REVISED: "Revised",
  PUBLISHED: "Published",
  TAKEN_DOWN: "Taken down",
  ARCHIVED: "Archived",
};

export const STUDENT_EDITABLE_STATUSES: ProjectStatus[] = [
  "DRAFT",
  "NEED_REVISION",
];

export const STUDENT_ARCHIVE_STATUSES: ProjectStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "NEED_REVISION",
  "REVISED",
];
