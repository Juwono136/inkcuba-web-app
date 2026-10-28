import "server-only";

import { NextRequest } from "next/server";

import { ForbiddenError, ValidationError } from "@/lib/api/errors";
import { rateLimit } from "@/lib/redis";
import { requireApiSession } from "@/lib/settings/require-api-session";
import { requireLecturerApi } from "@/lib/workspaces/require-lecturer-api";

export function clientMeta(request: NextRequest) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

export async function lecturerGuard(
  request: NextRequest,
  bucket: string,
  limit = 60,
  windowSec = 60,
) {
  const { session } = await requireLecturerApi();
  const result = await rateLimit(`${bucket}:${session.user.id}`, limit, windowSec);
  if (!result.success) {
    throw new ValidationError(
      "Too many requests. Please wait a moment and try again.",
    );
  }
  return {
    session,
    meta: { actorId: session.user.id, ...clientMeta(request) },
  };
}

export async function studentGuard(
  request: NextRequest,
  bucket: string,
  limit = 60,
  windowSec = 60,
) {
  const { session, role } = await requireApiSession();
  if (role !== "STUDENT") {
    throw new ForbiddenError("Student access required");
  }
  const result = await rateLimit(`${bucket}:${session.user.id}`, limit, windowSec);
  if (!result.success) {
    throw new ValidationError(
      "Too many requests. Please wait a moment and try again.",
    );
  }
  return {
    session,
    meta: { actorId: session.user.id, ...clientMeta(request) },
  };
}

export async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError("Invalid JSON body");
  }
}

export function requireId(value: string | undefined, label: string): string {
  const id = value?.trim();
  if (!id) throw new ValidationError(`${label} is required`);
  return id;
}
