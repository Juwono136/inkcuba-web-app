import Link from "next/link";
import { FolderKanban, Link2, Sparkles, UserRound } from "lucide-react";

import { WorkspaceDefaultBackground } from "@/components/lecturer/workspaces/workspace-form";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/require-role";
import { getPublicProfileHref } from "@/lib/profiles/public-profile-path";
import { listStudentWorkspaces } from "@/lib/workspaces/student-service";

export const metadata = {
  title: "Student Dashboard",
};

export default async function StudentDashboardPage() {
  const session = await requireRole(["STUDENT"]);
  const workspaces = await listStudentWorkspaces({
    studentId: session.user.id,
    page: 1,
    pageSize: 6,
  });
  const profileHref = getPublicProfileHref({
    id: session.user.id,
    role: "STUDENT",
    nim:
      "nim" in session.user
        ? ((session.user as { nim?: string | null }).nim ?? null)
        : null,
  });

  return (
    <DashboardShell
      title="Student Dashboard"
      description="Join class workspaces, track upcoming portfolio submissions, and manage your academic profile."
    >
      <div className="mb-6 overflow-hidden rounded-3xl border-2 border-inkcuba-navy bg-white shadow-inkcuba">
        <div className="border-b-2 border-inkcuba-navy bg-gradient-to-r from-sky-100 via-violet-100 to-amber-100 px-5 py-5 sm:px-7">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-inkcuba-navy uppercase">
            <Sparkles className="h-3.5 w-3.5 text-inkcuba-orange" />
            Welcome back
          </div>
          <p className="mt-1 font-heading text-xl font-bold text-slate-900 sm:text-3xl">
            {session.user.name}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Open your class workspaces, join with a lecturer invite, or polish
            your public profile for showcase and branding.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              asChild
              className="bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600"
            >
              <Link href="/dashboard/student/workspaces">
                <FolderKanban className="h-4 w-4" />
                My workspaces
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-900">
              <Link href="/join">
                <Link2 className="h-4 w-4" />
                Join with code
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-900">
              <Link href={profileHref} target="_blank" rel="noopener noreferrer">
                <UserRound className="h-4 w-4" />
                Public profile
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900">
              Recent workspaces
            </h2>
            <p className="text-sm text-slate-600">
              Jump back into classes you have already joined.
            </p>
          </div>
          {workspaces.total > 0 ? (
            <Link
              href="/dashboard/student/workspaces"
              className="text-xs font-semibold text-inkcuba-purple underline-offset-2 hover:underline"
            >
              See all ({workspaces.total})
            </Link>
          ) : null}
        </div>

        {workspaces.items.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-inkcuba-navy bg-white p-8 text-center shadow-inkcuba">
            <p className="text-sm text-slate-600">
              You have not joined a workspace yet. Ask your lecturer for an
              invite link or code.
            </p>
            <Button
              asChild
              className="mt-4 bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600"
            >
              <Link href="/join">Join a workspace</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {workspaces.items.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/student/workspaces/${item.id}`}
                className="group overflow-hidden rounded-2xl border-2 border-inkcuba-navy bg-white shadow-inkcuba transition hover:-translate-y-1"
              >
                <div className="relative aspect-[2.2/1] w-full overflow-hidden">
                  {item.backgroundImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.backgroundImageUrl}
                      alt=""
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <WorkspaceDefaultBackground
                      compact
                      className="h-full w-full"
                    />
                  )}
                </div>
                <div className="space-y-1 p-4">
                  <h3 className="font-heading text-base font-bold text-slate-900 group-hover:text-inkcuba-purple">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {item.className} · {item.semesterLabel}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
