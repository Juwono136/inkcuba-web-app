import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ProjectListClient } from "@/components/student/projects/project-list-client";
import { requireRole } from "@/lib/auth/require-role";

export const metadata = { title: "Project lists" };

export default async function StudentProjectsPage() {
  await requireRole(["STUDENT"]);
  return (
    <DashboardShell title="Project lists" description="Projects you prepared or submitted." hideHeader>
      <ProjectListClient />
    </DashboardShell>
  );
}
