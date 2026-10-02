import { WorkspaceDetailClient } from "@/components/lecturer/workspaces/workspace-detail-client";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/require-role";

export const metadata = {
  title: "Workspace",
};

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function LecturerWorkspaceDetailPage({
  params,
}: PageProps) {
  await requireRole(["LECTURER"]);
  const { workspaceId } = await params;

  return (
    <DashboardShell
      title="Workspace"
      description="Workspace details and tools."
      hideHeader
    >
      <WorkspaceDetailClient workspaceId={workspaceId} />
    </DashboardShell>
  );
}
