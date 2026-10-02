import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import {
  createLecturerWorkspace,
  listLecturerWorkspaces,
  requireLecturerApi,
  workspaceCreateSchema,
  workspaceListQuerySchema,
} from "@/lib/workspaces";

function clientMeta(request: NextRequest) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { session } = await requireLecturerApi();
    const limit = await rateLimit(
      `lecturer-workspaces-list:${session.user.id}`,
      60,
      60,
    );
    if (!limit.success) {
      throw new ValidationError(
        "Too many requests. Please wait a moment and try again.",
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = workspaceListQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      semester: searchParams.get("semester") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortDir: searchParams.get("sortDir") ?? undefined,
    });

    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid list query",
        parsed.error.flatten(),
      );
    }

    const page = await listLecturerWorkspaces({
      lecturerId: session.user.id,
      query: parsed.data,
    });

    return apiSuccess(page);
  } catch (error) {
    return handleApiError(error, "lecturer-workspaces-list");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireLecturerApi();
    const limit = await rateLimit(
      `lecturer-workspaces-create:${session.user.id}`,
      20,
      60 * 15,
    );
    if (!limit.success) {
      throw new ValidationError(
        "Too many requests. Please wait a moment and try again.",
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    let raw: Record<string, unknown> = {};
    let backgroundFile: {
      fileName: string;
      mimeType: string;
      size: number;
      buffer: Buffer;
    } | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      raw = {
        name: form.get("name"),
        className: form.get("className"),
        semester: form.get("semester"),
        description: form.get("description"),
        status: form.get("status") || undefined,
      };

      const file = form.get("background");
      if (file instanceof File && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        backgroundFile = {
          fileName: file.name || "background.jpg",
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          buffer,
        };
      }
    } else {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") {
        throw new ValidationError("Invalid request body");
      }
      raw = body as Record<string, unknown>;
    }

    const parsed = workspaceCreateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid workspace payload",
        parsed.error.flatten(),
      );
    }

    const meta = clientMeta(request);
    const workspace = await createLecturerWorkspace({
      lecturerId: session.user.id,
      data: parsed.data,
      backgroundFile,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiSuccess({ workspace }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "lecturer-workspaces-create");
  }
}
