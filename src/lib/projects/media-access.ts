import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { portfolio, portfolioContributor } from "@/db/schema/portfolios";
import { workspace } from "@/db/schema/workspaces";
import { ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { requireApiSession } from "@/lib/settings/require-api-session";

/** `projects/{portfolioId}/...` */
export function parseProjectMediaPortfolioId(key: string): string | null {
  if (!key.startsWith("projects/")) return null;
  const portfolioId = key.slice("projects/".length).split("/")[0]?.trim() ?? "";
  return portfolioId || null;
}

export async function assertCanReadProjectMedia(key: string) {
  const portfolioId = parseProjectMediaPortfolioId(key);
  if (!portfolioId) throw new ForbiddenError("Media access is not allowed for this resource");

  const { session, role } = await requireApiSession();
  if (role === "ADMIN") return { portfolioId, userId: session.user.id };

  const [row] = await db
    .select({
      id: portfolio.id,
      workspaceId: portfolio.workspaceId,
      submittedById: portfolio.submittedById,
      lecturerId: workspace.lecturerId,
    })
    .from(portfolio)
    .leftJoin(workspace, eq(workspace.id, portfolio.workspaceId))
    .where(eq(portfolio.id, portfolioId))
    .limit(1);
  if (!row) throw new NotFoundError("Media not found");

  if (row.lecturerId && row.lecturerId === session.user.id) {
    return { portfolioId, userId: session.user.id };
  }
  if (row.submittedById === session.user.id) {
    return { portfolioId, userId: session.user.id };
  }

  const [contributor] = await db
    .select({ id: portfolioContributor.id })
    .from(portfolioContributor)
    .where(
      and(
        eq(portfolioContributor.portfolioId, portfolioId),
        eq(portfolioContributor.userId, session.user.id),
      ),
    )
    .limit(1);
  if (contributor) return { portfolioId, userId: session.user.id };

  throw new ForbiddenError("You cannot view this project file");
}
