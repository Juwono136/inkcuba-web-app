import { Suspense } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StudentWorkspaceDetailClient } from "@/components/student/workspaces/student-workspace-detail-client";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import { requireRole } from "@/lib/auth/require-role";

export const metadata = {
  title: "Workspace",
};

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function StudentWorkspaceDetailPage({
  params,
}: PageProps) {
  await requireRole(["STUDENT"]);
  const { workspaceId } = await params;

  return (
    <DashboardShell
      title="Workspace"
      description="Your class workspace."
      hideHeader
    >
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <InkcubaLoader label="Loading workspace…" />
          </div>
        }
      >
        <StudentWorkspaceDetailClient workspaceId={workspaceId} />
      </Suspense>
    </DashboardShell>
  );
}
