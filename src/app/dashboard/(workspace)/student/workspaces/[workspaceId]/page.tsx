import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StudentWorkspaceDetailClient } from "@/components/student/workspaces/student-workspace-detail-client";
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
      <StudentWorkspaceDetailClient workspaceId={workspaceId} />
    </DashboardShell>
  );
}
