import { z } from "zod";

import {
  PROFILE_CUSTOM_LINKS_MAX,
  PROFILE_CUSTOM_LINK_LABEL_MAX,
} from "@/lib/settings/profile-links";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validatePasswordStrength,
} from "@/lib/validators/password";

const optionalUrl = z
  .union([z.string().trim().url("Please enter a valid URL"), z.literal("")])
  .optional()
  .transform((value) => (value === "" ? undefined : value));

function softDomainCheck(
  url: string | undefined,
  domains: string[],
  label: string,
): string | undefined {
  if (!url) return undefined;

  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const ok = domains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );

    if (!ok) {
      throw new Error(`Please enter a valid ${label} URL`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Please enter")) {
      throw error;
    }
    throw new Error(`Please enter a valid ${label} URL`);
  }

  return url;
}

const skillTagSchema = z
  .string()
  .trim()
  .min(1, "Skill tags cannot be empty")
  .max(30, "Each skill tag must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9 +/#.]+$/,
    "Skill tags may only include letters, numbers, spaces, and + / # .",
  );

const profileCustomLinkSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Link name is required")
    .max(
      PROFILE_CUSTOM_LINK_LABEL_MAX,
      `Link name must be at most ${PROFILE_CUSTOM_LINK_LABEL_MAX} characters`,
    ),
  url: z.string().trim().url("Please enter a valid link URL"),
});

export const publicProfileSchema = z
  .object({
    bio: z.string().optional(),
    skills: z.array(skillTagSchema).max(10, "You can add at most 10 skills").optional(),
    linkedinUrl: optionalUrl,
    githubUrl: optionalUrl,
    instagramUrl: optionalUrl,
    youtubeUrl: optionalUrl,
    twitterUrl: optionalUrl,
    tiktokUrl: optionalUrl,
    portfolioLinks: z
      .array(profileCustomLinkSchema)
      .max(
        PROFILE_CUSTOM_LINKS_MAX,
        `You can add at most ${PROFILE_CUSTOM_LINKS_MAX} custom links`,
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    try {
      softDomainCheck(data.linkedinUrl, ["linkedin.com"], "LinkedIn");
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        path: ["linkedinUrl"],
        message: error instanceof Error ? error.message : "Invalid LinkedIn URL",
      });
    }

    try {
      softDomainCheck(data.githubUrl, ["github.com"], "GitHub");
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        path: ["githubUrl"],
        message: error instanceof Error ? error.message : "Invalid GitHub URL",
      });
    }

    try {
      softDomainCheck(data.instagramUrl, ["instagram.com"], "Instagram");
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        path: ["instagramUrl"],
        message:
          error instanceof Error ? error.message : "Invalid Instagram URL",
      });
    }

    try {
      softDomainCheck(
        data.youtubeUrl,
        ["youtube.com", "youtu.be"],
        "YouTube",
      );
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        path: ["youtubeUrl"],
        message: error instanceof Error ? error.message : "Invalid YouTube URL",
      });
    }

    try {
      softDomainCheck(
        data.twitterUrl,
        ["twitter.com", "x.com"],
        "X (Twitter)",
      );
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        path: ["twitterUrl"],
        message:
          error instanceof Error ? error.message : "Invalid X (Twitter) URL",
      });
    }

    try {
      softDomainCheck(data.tiktokUrl, ["tiktok.com"], "TikTok");
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        path: ["tiktokUrl"],
        message: error instanceof Error ? error.message : "Invalid TikTok URL",
      });
    }

    const links = data.portfolioLinks ?? [];
    const seenLabels = new Set<string>();
    for (let index = 0; index < links.length; index += 1) {
      const key = links[index].label.trim().toLowerCase();
      if (seenLabels.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["portfolioLinks", index, "label"],
          message: "Link names must be unique",
        });
      }
      seenLabels.add(key);
    }
  });

export type PublicProfileInput = z.infer<typeof publicProfileSchema>;

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`)
  .superRefine((password, ctx) => {
    const result = validatePasswordStrength(password);

    if (!result.valid && result.message) {
      ctx.addIssue({
        code: "custom",
        message: result.message,
      });
    }
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
