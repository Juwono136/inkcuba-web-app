import { NextRequest } from "next/server";
import { hashPassword } from "better-auth/crypto";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { account } from "@/db/schema/auth";
import {
  workspaceInvitationToken,
  workspaceMember,
} from "@/db/schema/workspaces";
import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import { hashInvitationToken } from "@/lib/workspaces/import-storage";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validatePasswordStrength,
} from "@/lib/validators/password";
import { z } from "zod";

const activateSchema = z
  .object({
    token: z.string().min(20),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH)
      .max(PASSWORD_MAX_LENGTH),
    confirmPassword: z.string().min(1),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .superRefine((v, ctx) => {
    const strength = validatePasswordStrength(v.password);
    if (!strength.valid && strength.message) {
      ctx.addIssue({ code: "custom", message: strength.message, path: ["password"] });
    }
  });

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const limit = await rateLimit(`auth-activate:${ip}`, 20, 60 * 15);
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    const body = await request.json().catch(() => null);
    const parsed = activateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid activation payload",
      );
    }

    const tokenHash = hashInvitationToken(parsed.data.token);
    const rows = await db
      .select()
      .from(workspaceInvitationToken)
      .where(
        and(
          eq(workspaceInvitationToken.tokenHash, tokenHash),
          eq(workspaceInvitationToken.purpose, "INVITE_ACTIVATE"),
          isNull(workspaceInvitationToken.usedAt),
        ),
      )
      .limit(1);

    const invite = rows[0];
    if (!invite || invite.expiresAt.getTime() < Date.now()) {
      throw new ValidationError(
        "This activation link is invalid or has expired.",
      );
    }

    const hashed = await hashPassword(parsed.data.password);
    const accounts = await db
      .select()
      .from(account)
      .where(eq(account.userId, invite.userId))
      .limit(1);

    if (accounts[0]) {
      await db
        .update(account)
        .set({ password: hashed })
        .where(eq(account.id, accounts[0].id));
    } else {
      await db.insert(account).values({
        id: crypto.randomUUID(),
        accountId: invite.userId,
        providerId: "credential",
        userId: invite.userId,
        password: hashed,
      });
    }

    await db
      .update(workspaceInvitationToken)
      .set({ usedAt: new Date() })
      .where(eq(workspaceInvitationToken.id, invite.id));

    if (invite.memberId) {
      await db
        .update(workspaceMember)
        .set({
          status: "ACTIVE",
          joinedAt: new Date(),
        })
        .where(eq(workspaceMember.id, invite.memberId));
    }

    return apiSuccess({ activated: true });
  } catch (error) {
    return handleApiError(error, "auth-activate");
  }
}
