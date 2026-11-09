import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ProjectEditor } from "@/components/student/projects/project-editor";
import { requireRole } from "@/lib/auth/require-role";

export const metadata = { title: "Project" };

type PageProps = {
  params: Promise<{ portfolioId: string }>;
  searchParams: Promise<{ source?: string }>;
};

export default async function StudentProjectPage({ params, searchParams }: PageProps) {
  await requireRole(["STUDENT"]);
  const { portfolioId } = await params;
  const query = await searchParams;
  const source = query.source === "submission" ? "submission" : "lists";
  return (
    <DashboardShell title="Project" description="Prepare, review, or manage your project." hideHeader>
      <ProjectEditor portfolioId={portfolioId} source={source} />
    </DashboardShell>
  );
}
