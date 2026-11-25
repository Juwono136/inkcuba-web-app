import { NextRequest } from "next/server";

import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { db } from "@/db";
import { portfolio } from "@/db/schema/portfolios";
import { and, eq } from "drizzle-orm";
import { listPortfolioEventsPage } from "@/lib/projects/events";
import { portfolioEventsQuerySchema } from "@/lib/projects/validators";
import { lecturerGuard, requireId } from "@/lib/workspaces/submissions/http";
import { loadOwnedWorkspace } from "@/lib/workspaces/submissions/access";

type RouteContext = { params: Promise<{ workspaceId: string; portfolioId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await lecturerGuard(request, "lecturer-project-events");
    const params = await context.params;
    const workspaceId = requireId(params.workspaceId, "Workspace id");
    const portfolioId = requireId(params.portfolioId, "Project id");
    await loadOwnedWorkspace(workspaceId, session.user.id);

    const parsed = portfolioEventsQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Check the history filters");
    }

    const [row] = await db
      .select({ id: portfolio.id })
      .from(portfolio)
      .where(and(eq(portfolio.id, portfolioId), eq(portfolio.workspaceId, workspaceId)))
      .limit(1);
    if (!row) throw new NotFoundError("Project not found");

    const page = await listPortfolioEventsPage({
      portfolioId,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });
    return apiSuccess(page);
  } catch (error) {
    return handleApiError(error, "lecturer-project-events");
  }
}
