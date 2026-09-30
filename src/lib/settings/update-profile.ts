import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  lecturerProfile,
  studentProfile,
} from "@/db/schema/profiles";
import { ForbiddenError, ValidationError } from "@/lib/api/errors";
import type { UserRole } from "@/lib/auth/permissions";
import {
  finalizeProfileCustomLinks,
  type ProfileCustomLink,
} from "@/lib/settings/profile-links";
import {
  assertBioLength,
  sanitizeBioHtml,
} from "@/lib/settings/sanitize-bio";
import {
  publicProfileSchema,
  type PublicProfileInput,
} from "@/lib/validators/settings";

function normalizeOptionalUrl(value: string | undefined): string | null {
  if (!value) return null;
  return value.trim() || null;
}

function normalizePortfolioLinks(
  links: ProfileCustomLink[] | undefined,
): ProfileCustomLink[] | null {
  const next = finalizeProfileCustomLinks(links ?? []);
  return next.length > 0 ? next : null;
}

function normalizeSkills(skills: string[] | undefined): string[] | null {
  if (!skills || skills.length === 0) return null;
  return skills.map((skill) => skill.trim()).filter(Boolean);
}

export async function updatePublicProfile(input: {
  userId: string;
  role: UserRole;
  data: unknown;
}) {
  if (input.role === "ADMIN") {
    throw new ForbiddenError("Admins cannot edit a public profile");
  }

  if (input.role !== "STUDENT" && input.role !== "LECTURER") {
    throw new ForbiddenError("Public profile is not available for this role");
  }

  const parsed = publicProfileSchema.safeParse(input.data);

  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Invalid profile data",
      parsed.error.flatten(),
    );
  }

  const data: PublicProfileInput = parsed.data;

  let bio: string | null = null;

  try {
    bio = sanitizeBioHtml(data.bio ?? null);
    assertBioLength(bio);
  } catch (error) {
    throw new ValidationError(
      error instanceof Error ? error.message : "Invalid bio content",
    );
  }

  const payload = {
    bio,
    skills: normalizeSkills(data.skills),
    linkedinUrl: normalizeOptionalUrl(data.linkedinUrl),
    githubUrl: normalizeOptionalUrl(data.githubUrl),
    instagramUrl: normalizeOptionalUrl(data.instagramUrl),
    youtubeUrl: normalizeOptionalUrl(data.youtubeUrl),
    twitterUrl: normalizeOptionalUrl(data.twitterUrl),
    tiktokUrl: normalizeOptionalUrl(data.tiktokUrl),
    portfolioLinks: normalizePortfolioLinks(data.portfolioLinks),
    updatedAt: new Date(),
  };

  if (input.role === "STUDENT") {
    const existing = await db
      .select({ id: studentProfile.id })
      .from(studentProfile)
      .where(eq(studentProfile.userId, input.userId))
      .limit(1);

    if (!existing[0]) {
      await db.insert(studentProfile).values({
        id: crypto.randomUUID(),
        userId: input.userId,
        isAlumni: false,
        ...payload,
      });
    } else {
      await db
        .update(studentProfile)
        .set(payload)
        .where(eq(studentProfile.userId, input.userId));
    }
  } else {
    const existing = await db
      .select({ id: lecturerProfile.id })
      .from(lecturerProfile)
      .where(eq(lecturerProfile.userId, input.userId))
      .limit(1);

    if (!existing[0]) {
      await db.insert(lecturerProfile).values({
        id: crypto.randomUUID(),
        userId: input.userId,
        ...payload,
      });
    } else {
      await db
        .update(lecturerProfile)
        .set(payload)
        .where(eq(lecturerProfile.userId, input.userId));
    }
  }

  return payload;
}
