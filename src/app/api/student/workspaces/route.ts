import { NextRequest } from "next/server";
import { z } from "zod";

import { ForbiddenError, ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import { requireApiSession } from "@/lib/settings/require-api-session";
import { listStudentWorkspaces } from "@/lib/workspaces/student-service";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
  q: z.string().trim().max(200).optional().default(""),
  semester: z.string().trim().max(120).optional().default(""),
  className: z.string().trim().max(120).optional().default(""),
});

export async function GET(request: NextRequest) {
  try {
    const { session, role } = await requireApiSession();
    if (role !== "STUDENT") {
      throw new ForbiddenError("Student access required");
    }

    const limit = await rateLimit(
      `student-workspaces-list:${session.user.id}`,
      60,
      60,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    const { searchParams } = request.nextUrl;
    const parsed = listQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      semester: searchParams.get("semester") ?? undefined,
      className: searchParams.get("className") ?? undefined,
    });
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid query",
      );
    }

    const data = await listStudentWorkspaces({
      studentId: session.user.id,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      q: parsed.data.q,
      semester: parsed.data.semester || undefined,
      className: parsed.data.className || undefined,
    });

    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error, "student-workspaces-list");
  }
}
