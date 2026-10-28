import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { lecturerGuard, readJson, requireId } from "@/lib/workspaces/submissions/http";
import {
  deleteLecturerSubmission,
  getLecturerSubmission,
  submissionWriteSchema,
  updateLecturerSubmission,
} from "@/lib/workspaces/submissions";

type RouteContext = {
  params: Promise<{ workspaceId: string; submissionId: string }>;
};

async function ids(context: RouteContext) {
  const params = await context.params;
  return {
    workspaceId: requireId(params.workspaceId, "Workspace id"),
    submissionId: requireId(params.submissionId, "Submission id"),
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await lecturerGuard(request, "lecturer-submission-get");
    const { workspaceId, submissionId } = await ids(context);
    const submission = await getLecturerSubmission({
      workspaceId,
      lecturerId: session.user.id,
      assignmentId: submissionId,
    });
    return apiSuccess({ submission });
  } catch (error) {
    return handleApiError(error, "lecturer-submission-get");
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { session, meta } = await lecturerGuard(
      request,
      "lecturer-submission-patch",
      40,
      60 * 15,
    );
    const { workspaceId, submissionId } = await ids(context);
    const parsed = submissionWriteSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid submission");
    }
    const submission = await updateLecturerSubmission({
      workspaceId,
      lecturerId: session.user.id,
      assignmentId: submissionId,
      data: parsed.data,
      meta,
    });
    return apiSuccess({ submission });
  } catch (error) {
    return handleApiError(error, "lecturer-submission-patch");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { session, meta } = await lecturerGuard(
      request,
      "lecturer-submission-delete",
      20,
      60 * 15,
    );
    const { workspaceId, submissionId } = await ids(context);
    await deleteLecturerSubmission({
      workspaceId,
      lecturerId: session.user.id,
      assignmentId: submissionId,
      meta,
    });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error, "lecturer-submission-delete");
  }
}
