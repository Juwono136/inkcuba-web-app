import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { lecturerGuard, requireId } from "@/lib/workspaces/submissions/http";
import {
  addSubmissionGroups,
  addSubmissionGroupsSchema,
  listSubmissionGroups,
  submissionGroupsQuerySchema,
} from "@/lib/workspaces/submissions";
import { loadOwnedWorkspace } from "@/lib/workspaces/submissions/access";

type RouteContext = {
  params: Promise<{ workspaceId: string; submissionId: string }>;
};

const IDEMPOTENCY_KEY =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function readAddGroupsBody(request: NextRequest): Promise<{ count: number }> {
  const text = await request.text();
  if (!text.trim()) return { count: 1 };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ValidationError("Invalid JSON body");
  }
  const parsed = addSubmissionGroupsSchema.safeParse(json);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid group count");
  }
  return parsed.data;
}

function readIdempotencyKey(request: NextRequest): string | null {
  const key = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!key) return null;
  if (!IDEMPOTENCY_KEY.test(key) || key.length > 80) {
    throw new ValidationError("Invalid idempotency key");
  }
  return key.toLowerCase();
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await lecturerGuard(request, "lecturer-submission-groups");
    const params = await context.params;
    const workspaceId = requireId(params.workspaceId, "Workspace id");
    const submissionId = requireId(params.submissionId, "Submission id");
    await loadOwnedWorkspace(workspaceId, session.user.id);
    const { searchParams } = new URL(request.url);
    const parsed = submissionGroupsQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      unassignedPage: searchParams.get("unassignedPage") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid query");
    }
    const groups = await listSubmissionGroups({
      workspaceId,
      assignmentId: submissionId,
      query: parsed.data,
    });
    return apiSuccess(groups);
  } catch (error) {
    return handleApiError(error, "lecturer-submission-groups");
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session, meta } = await lecturerGuard(
      request,
      "lecturer-submission-group-add",
      30,
      60 * 15,
    );
    const params = await context.params;
    const workspaceId = requireId(params.workspaceId, "Workspace id");
    const submissionId = requireId(params.submissionId, "Submission id");
    await loadOwnedWorkspace(workspaceId, session.user.id);
    const body = await readAddGroupsBody(request);
    const idempotencyKey = readIdempotencyKey(request);
    const created = await addSubmissionGroups({
      workspaceId,
      assignmentId: submissionId,
      count: body.count,
      idempotencyKey,
      meta,
    });
    return apiSuccess(created);
  } catch (error) {
    return handleApiError(error, "lecturer-submission-group-add");
  }
}
