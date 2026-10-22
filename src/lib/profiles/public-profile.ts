import "server-only";

import { and, eq, ilike, isNull } from "drizzle-orm";

import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { lecturerProfile, studentProfile } from "@/db/schema/profiles";
import { NotFoundError } from "@/lib/api/errors";
import { resolveUserRole, type UserRole } from "@/lib/auth/permissions";
import { formatUserRole } from "@/lib/auth/role-labels";
import { resolveDirectoryLabels } from "@/lib/directory/service";
import { resolveUserImageUrl } from "@/lib/media/resolve-avatar-url";
import { sanitizeBioHtml } from "@/lib/settings/sanitize-bio";

export type PublicProfileRole = Extract<UserRole, "STUDENT" | "LECTURER">;

export type PublicProfileRecord = {
  id: string;
  /** Canonical public path for this profile (`/u/...`). */
  profilePath: string;
  /** Public handle used in URL — BINUSIAN ID (`user.nim`) when set. */
  binusianId: string | null;
  role: PublicProfileRole;
  roleLabel: string;
  name: string;
  image: string | null;
  title: string | null;
  campusLabel: string | null;
  majorLabel: string | null;
  departmentLabel: string | null;
  batchLabel: string | null;
  semesterLabel: string | null;
  isAlumni: boolean;
  alumniLabel: string | null;
  bioHtml: string | null;
  skills: string[];
  social: {
    linkedinUrl: string | null;
    githubUrl: string | null;
    instagramUrl: string | null;
    youtubeUrl: string | null;
    twitterUrl: string | null;
    tiktokUrl: string | null;
    portfolioLinks: { label: string; url: string }[];
  };
  verifiedPortfolios: Array<{
    id: string;
    title: string;
    summary: string | null;
    href: string | null;
  }>;
};

function emptyOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLikelyUserId(identifier: string): boolean {
  return UUID_RE.test(identifier.trim());
}

/**
 * Canonical public URL. Prefer BINUSIAN ID stored on `user.nim` for both
 * students and lecturers (admin/user-management convention).
 */
export function buildPublicProfilePath(input: {
  id: string;
  nim: string | null | undefined;
}): string {
  const binusianId = emptyOrNull(input.nim);
  if (binusianId) {
    return `/u/${encodeURIComponent(binusianId)}`;
  }
  return `/u/${encodeURIComponent(input.id)}`;
}

export async function getPublicProfileByIdentifier(
  identifier: string,
): Promise<PublicProfileRecord> {
  const raw = identifier.trim();
  if (!raw || raw.length > 80) {
    throw new NotFoundError("Profile not found");
  }

  const decoded = decodeURIComponent(raw);

  let rows = isLikelyUserId(decoded)
    ? await db
        .select()
        .from(userTable)
        .where(
          and(
            eq(userTable.id, decoded),
            eq(userTable.isActive, true),
            isNull(userTable.deletedAt),
          ),
        )
        .limit(1)
    : await db
        .select()
        .from(userTable)
        .where(
          and(
            ilike(userTable.nim, decoded),
            eq(userTable.isActive, true),
            isNull(userTable.deletedAt),
          ),
        )
        .limit(1);

  // Legacy fallback: resolve by id when identifier is not a UUID-shaped string
  if (!rows[0] && !isLikelyUserId(decoded)) {
    rows = await db
      .select()
      .from(userTable)
      .where(
        and(
          eq(userTable.id, decoded),
          eq(userTable.isActive, true),
          isNull(userTable.deletedAt),
        ),
      )
      .limit(1);
  }

  const user = rows[0];
  if (!user) throw new NotFoundError("Profile not found");

  const role = resolveUserRole(user);
  if (role !== "STUDENT" && role !== "LECTURER") {
    throw new NotFoundError("Profile not found");
  }

  const campus = emptyOrNull(user.campus);
  let major: string | null = null;
  let batch: string | null = null;
  let semester: string | null = null;
  let department: string | null = null;
  let title: string | null = null;
  let isAlumni = false;
  let bio: string | null = null;
  let skills: string[] = [];
  let social = {
    linkedinUrl: null as string | null,
    githubUrl: null as string | null,
    instagramUrl: null as string | null,
    youtubeUrl: null as string | null,
    twitterUrl: null as string | null,
    tiktokUrl: null as string | null,
    portfolioLinks: [] as { label: string; url: string }[],
  };

  if (role === "STUDENT") {
    const profileRows = await db
      .select()
      .from(studentProfile)
      .where(eq(studentProfile.userId, user.id))
      .limit(1);
    const profile = profileRows[0];
    if (profile) {
      major = emptyOrNull(profile.major);
      batch = emptyOrNull(profile.batch);
      semester = emptyOrNull(profile.semester);
      department = emptyOrNull(profile.department);
      title = emptyOrNull(profile.title);
      isAlumni = profile.isAlumni;
      bio = profile.bio;
      skills = profile.skills ?? [];
      social = {
        linkedinUrl: profile.linkedinUrl,
        githubUrl: profile.githubUrl,
        instagramUrl: profile.instagramUrl,
        youtubeUrl: profile.youtubeUrl,
        twitterUrl: profile.twitterUrl,
        tiktokUrl: profile.tiktokUrl,
        portfolioLinks: profile.portfolioLinks ?? [],
      };
    }
  } else {
    const profileRows = await db
      .select()
      .from(lecturerProfile)
      .where(eq(lecturerProfile.userId, user.id))
      .limit(1);
    const profile = profileRows[0];
    if (profile) {
      major = emptyOrNull(profile.major);
      department = emptyOrNull(profile.department);
      title = emptyOrNull(profile.title);
      bio = profile.bio;
      skills = profile.skills ?? [];
      social = {
        linkedinUrl: profile.linkedinUrl,
        githubUrl: profile.githubUrl,
        instagramUrl: profile.instagramUrl,
        youtubeUrl: profile.youtubeUrl,
        twitterUrl: profile.twitterUrl,
        tiktokUrl: profile.tiktokUrl,
        portfolioLinks: profile.portfolioLinks ?? [],
      };
    }
  }

  const labels = await resolveDirectoryLabels([
    { category: "campus", value: campus },
    { category: "major", value: major },
    { category: "batch", value: batch },
    { category: "semester", value: semester },
    { category: "department", value: department },
  ]);

  const binusianId = emptyOrNull(user.nim);
  const alumniLabel = isAlumni
    ? batch
      ? `Alumni BINUS · Batch ${labels.batch ?? batch}`
      : "Alumni BINUS"
    : null;

  return {
    id: user.id,
    profilePath: buildPublicProfilePath({ id: user.id, nim: user.nim }),
    binusianId,
    role,
    roleLabel: formatUserRole(role),
    name: user.name,
    image: resolveUserImageUrl(user.image),
    title,
    campusLabel: labels.campus,
    majorLabel: labels.major,
    departmentLabel: labels.department,
    batchLabel: labels.batch,
    semesterLabel: labels.semester,
    isAlumni,
    alumniLabel,
    bioHtml: sanitizeBioHtml(bio),
    skills: skills.filter(Boolean),
    social,
    verifiedPortfolios: [],
  };
}
