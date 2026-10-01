import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import {
  lecturerProfile,
  studentProfile,
} from "@/db/schema/profiles";
import { resolveUserRole, type UserRole } from "@/lib/auth/permissions";
import { formatUserRole } from "@/lib/auth/role-labels";
import { AppError, NotFoundError } from "@/lib/api/errors";
import { resolveDirectoryLabels } from "@/lib/directory/service";
import type { DirectoryOptionCategory } from "@/lib/directory/types";
import { getEditableFieldsForRole } from "@/lib/role-field-permissions/service";
import type { SettingsIdentityField } from "@/lib/role-field-permissions/types";

/** Current display labels for directory-backed identity fields (value keys stay on the base fields). */
export type SettingsDirectoryLabels = Record<
  DirectoryOptionCategory,
  string | null
>;

export type SettingsIdentity = {
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  campus: string | null;
  binusianId: string | null;
  nim: string | null;
  nidn: string | null;
  major: string | null;
  batch: string | null;
  semester: string | null;
  isAlumni: boolean;
  alumniLabel: string | null;
  department: string | null;
  title: string | null;
  /**
   * Resolved Directory Options labels for campus/major/batch/semester/department.
   * Profiles store immutable `value` keys; labels can change without rewriting profiles.
   */
  directoryLabels: SettingsDirectoryLabels;
  /**
   * Fields the signed-in user may edit in My Settings (from role_field_permission).
   * Empty array = fully read-only identity section.
   */
  editableFields: SettingsIdentityField[];
  /** True when name and/or title are self-editable. */
  canEditNameAndTitle: boolean;
};

export type SettingsPublicProfile = {
  bio: string | null;
  skills: string[];
  linkedinUrl: string | null;
  githubUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  twitterUrl: string | null;
  tiktokUrl: string | null;
  portfolioLinks: { label: string; url: string }[];
};

export type SettingsPayload = {
  identity: SettingsIdentity;
  image: string | null;
  canEditPublicProfile: boolean;
  publicProfile: SettingsPublicProfile | null;
};

function emptyOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function ensureStudentProfile(userId: string) {
  try {
    const existing = await db
      .select()
      .from(studentProfile)
      .where(eq(studentProfile.userId, userId))
      .limit(1);

    if (existing[0]) return existing[0];

    const [created] = await db
      .insert(studentProfile)
      .values({
        id: crypto.randomUUID(),
        userId,
        isAlumni: false,
      })
      .returning();

    return created;
  } catch (error) {
    throw new AppError(
      "Unable to load student profile. Please try again or contact support.",
      500,
      "STUDENT_PROFILE_LOAD_FAILED",
      error instanceof Error ? error.message : undefined,
    );
  }
}

async function ensureLecturerProfile(userId: string) {
  try {
    const existing = await db
      .select()
      .from(lecturerProfile)
      .where(eq(lecturerProfile.userId, userId))
      .limit(1);

    if (existing[0]) return existing[0];

    const [created] = await db
      .insert(lecturerProfile)
      .values({
        id: crypto.randomUUID(),
        userId,
      })
      .returning();

    return created;
  } catch (error) {
    throw new AppError(
      "Unable to load lecturer profile. Please try again or contact support.",
      500,
      "LECTURER_PROFILE_LOAD_FAILED",
      error instanceof Error ? error.message : undefined,
    );
  }
}

function mapStudentPublicProfile(
  profile: typeof studentProfile.$inferSelect,
): SettingsPublicProfile {
  return {
    bio: profile.bio,
    skills: profile.skills ?? [],
    linkedinUrl: profile.linkedinUrl,
    githubUrl: profile.githubUrl,
    instagramUrl: profile.instagramUrl,
    youtubeUrl: profile.youtubeUrl,
    twitterUrl: profile.twitterUrl,
    tiktokUrl: profile.tiktokUrl,
    portfolioLinks: profile.portfolioLinks ?? [],
  };
}

function mapLecturerPublicProfile(
  profile: typeof lecturerProfile.$inferSelect,
): SettingsPublicProfile {
  return {
    bio: profile.bio,
    skills: profile.skills ?? [],
    linkedinUrl: profile.linkedinUrl,
    githubUrl: profile.githubUrl,
    instagramUrl: profile.instagramUrl,
    youtubeUrl: profile.youtubeUrl,
    twitterUrl: profile.twitterUrl,
    tiktokUrl: profile.tiktokUrl,
    portfolioLinks: profile.portfolioLinks ?? [],
  };
}

export async function getSettingsForUser(userId: string): Promise<SettingsPayload> {
  const rows = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  const dbUser = rows[0];

  if (!dbUser) {
    throw new NotFoundError("User not found");
  }

  const role = resolveUserRole(dbUser);
  const canEditPublicProfile = role === "STUDENT" || role === "LECTURER";

  let major: string | null = null;
  let batch: string | null = null;
  let semester: string | null = null;
  let isAlumni = false;
  let alumniLabel: string | null = null;
  let department: string | null = null;
  let title: string | null = null;
  let publicProfile: SettingsPublicProfile | null = null;

  let binusianId: string | null = null;

  if (role === "STUDENT") {
    binusianId = emptyOrNull(dbUser.nim);
    const profile = await ensureStudentProfile(userId);
    major = emptyOrNull(profile.major);
    batch = emptyOrNull(profile.batch);
    semester = emptyOrNull(profile.semester);
    department = emptyOrNull(profile.department);
    title = emptyOrNull(profile.title);
    isAlumni = profile.isAlumni;
    if (isAlumni) {
      alumniLabel = batch
        ? `Alumni BINUS · Batch ${batch}`
        : "Alumni BINUS";
    }
    publicProfile = mapStudentPublicProfile(profile);
  } else if (role === "LECTURER") {
    binusianId = emptyOrNull(dbUser.nidn);
    const profile = await ensureLecturerProfile(userId);
    major = emptyOrNull(profile.major);
    department = emptyOrNull(profile.department);
    title = emptyOrNull(profile.title);
    publicProfile = mapLecturerPublicProfile(profile);
  } else if (role === "ADMIN") {
    binusianId = emptyOrNull(dbUser.nim) ?? emptyOrNull(dbUser.nidn);
    // Title / major / department for admins live on lecturer_profile (shared with admin patch).
    const profile = await ensureLecturerProfile(userId);
    major = emptyOrNull(profile.major);
    department = emptyOrNull(profile.department);
    title = emptyOrNull(profile.title);
  } else {
    binusianId = emptyOrNull(dbUser.nim) ?? emptyOrNull(dbUser.nidn);
  }

  const editableFields = await getEditableFieldsForRole(role);
  const canEditNameAndTitle =
    editableFields.includes("name") || editableFields.includes("title");

  const campus = emptyOrNull(dbUser.campus);
  const directoryLabels = await resolveDirectoryLabels([
    { category: "campus", value: campus },
    { category: "major", value: major },
    { category: "batch", value: batch },
    { category: "semester", value: semester },
    { category: "department", value: department },
  ]);

  return {
    identity: {
      name: dbUser.name,
      email: dbUser.email,
      role,
      roleLabel: formatUserRole(role),
      campus,
      binusianId,
      nim: emptyOrNull(dbUser.nim),
      nidn: emptyOrNull(dbUser.nidn),
      major,
      batch,
      semester,
      isAlumni,
      alumniLabel,
      department,
      title,
      directoryLabels,
      editableFields,
      canEditNameAndTitle,
    },
    image: dbUser.image,
    canEditPublicProfile,
    publicProfile,
  };
}
