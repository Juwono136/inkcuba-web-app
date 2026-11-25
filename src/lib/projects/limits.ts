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
export const PROJECT_FEEDBACK_MAX = 5000;
export const PROJECT_FEEDBACK_MIN_REVISION = 1;
/** Max times a lecturer may request revision on one project (default product rule). */
export const PROJECT_MAX_REVISIONS = 2;

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

/** Students may shelve unfinished or revision work only — not items already in lecturer moderation. */
export const STUDENT_ARCHIVE_STATUSES: ProjectStatus[] = ["DRAFT", "NEED_REVISION"];

/** Statuses a student restore may return to after archive. */
export const STUDENT_UNARCHIVE_TARGET_STATUSES: ProjectStatus[] = ["DRAFT", "NEED_REVISION"];

/**
 * After submit, the project is locked for students while the lecturer moderates / scores.
 * Students cannot edit, archive, or delete these while the submission link still exists.
 */
export const STUDENT_MODERATION_LOCK_STATUSES: ProjectStatus[] = [
  "SUBMITTED",
  "IN_REVIEW",
  "REVISED",
  "PUBLISHED",
];

export function isStudentModerationLocked(status: string): boolean {
  return (STUDENT_MODERATION_LOCK_STATUSES as string[]).includes(status);
}

/**
 * While a group project is waiting for / under lecturer review, or already published,
 * members must not be moved. Lecturers may move again only during DRAFT or NEED_REVISION.
 */
export function isGroupMoveLockedForModeration(status: string): boolean {
  return (
    status === "SUBMITTED" ||
    status === "IN_REVIEW" ||
    status === "REVISED" ||
    status === "PUBLISHED"
  );
}

/**
 * Once any project on a submission has entered the scoring pipeline, the submission
 * type (individual/group) and group formation method must stay frozen.
 */
export const SUBMISSION_STRUCTURE_LOCK_STATUSES = [
  "SUBMITTED",
  "IN_REVIEW",
  "NEED_REVISION",
  "REVISED",
  "PUBLISHED",
] as const;

export function isSubmissionStructureLockStatus(status: string): boolean {
  return (SUBMISSION_STRUCTURE_LOCK_STATUSES as readonly string[]).includes(status);
}

export function projectOpenCta(status: string | null | undefined): {
  label: string;
  title: string;
  description: string;
} {
  if (!status || status === "DRAFT") {
    return {
      label: "Open project",
      title: "Continue your project",
      description: "Open the project page to keep editing your draft or submit when the window allows it.",
    };
  }
  if (status === "NEED_REVISION") {
    return {
      label: "Revise project",
      title: "Revision requested",
      description: "Open the project to apply lecturer feedback and resubmit before the deadline.",
    };
  }
  if (status === "SUBMITTED" || status === "IN_REVIEW" || status === "REVISED") {
    return {
      label: "View submitted project",
      title: "In lecturer review",
      description: "Your project is with the lecturer. You can open it to read the record — editing stays closed until a revision is requested.",
    };
  }
  if (status === "PUBLISHED") {
    return {
      label: "View published project",
      title: "Published project",
      description: "This project is published and verified. Open it to view the score and final record.",
    };
  }
  if (status === "ARCHIVED") {
    return {
      label: "Open project",
      title: "Archived project",
      description: "Open the archived project record. Restore it from the project page if you need to edit again.",
    };
  }
  return {
    label: "Open project",
    title: "Open project",
    description: "Open the project page from this submission.",
  };
}
