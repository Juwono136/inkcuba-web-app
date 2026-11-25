import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { listPortfolioEventsPage } from "@/lib/projects/events";
import { getStudentProject } from "@/lib/projects/service";
import { portfolioEventsQuerySchema } from "@/lib/projects/validators";
import { requireId, studentGuard } from "@/lib/workspaces/submissions/http";

type RouteContext = { params: Promise<{ portfolioId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await studentGuard(request, "student-project-events");
    const params = await context.params;
    const portfolioId = requireId(params.portfolioId, "Project id");
    // Ensures the student can see this project before reading history.
    await getStudentProject({
      portfolioId,
      studentId: session.user.id,
      source: "lists",
    });

    const parsed = portfolioEventsQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Check the history filters");
    }

    const page = await listPortfolioEventsPage({
      portfolioId,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });
    return apiSuccess(page);
  } catch (error) {
    return handleApiError(error, "student-project-events");
  }
}
