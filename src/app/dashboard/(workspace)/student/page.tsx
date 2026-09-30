import { BookOpen, FolderKanban, Sparkles } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/require-role";

export const metadata = {
  title: "Student Dashboard",
};

export default async function StudentDashboardPage() {
  const session = await requireRole(["STUDENT"]);

  return (
    <DashboardShell
      title="Student Dashboard"
      description="Manage your portfolios, track submission status, and explore verified exhibition showcases."
    >
      <div className="mb-6 overflow-hidden rounded-2xl border-2 border-inkcuba-navy bg-white shadow-inkcuba">
        <div className="border-b-2 border-inkcuba-navy bg-gradient-to-r from-sky-100 via-violet-100 to-amber-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-inkcuba-navy uppercase">
            <Sparkles className="h-3.5 w-3.5 text-inkcuba-orange" />
            Welcome back
          </div>
          <p className="mt-1 font-heading text-xl font-bold text-slate-900 sm:text-2xl">
            {session.user.name}
          </p>
        </div>
        <div className="bg-inkcuba-doodle p-5 sm:p-6">
          <p className="text-sm leading-relaxed text-slate-600">
            Your portfolio workspace is ready to grow. Use the sidebar to jump
            between Overview, upcoming Portfolios, and My Settings — collapse it
            anytime for a wider canvas.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border-2 border-inkcuba-navy bg-gradient-to-br from-sky-50 to-white p-5 shadow-inkcuba">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-inkcuba-navy bg-sky-100 text-inkcuba-cyan">
            <FolderKanban className="h-5 w-5" />
          </div>
          <h2 className="font-heading text-lg font-bold text-slate-900">
            Portfolios
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Submit and polish course portfolios for the exhibition hall.
          </p>
          <p className="mt-4 text-xs font-bold tracking-wide text-inkcuba-purple uppercase">
            Coming soon
          </p>
        </div>

        <div className="rounded-2xl border-2 border-inkcuba-navy bg-gradient-to-br from-amber-50 to-white p-5 shadow-inkcuba">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-inkcuba-navy bg-amber-100 text-inkcuba-orange">
            <BookOpen className="h-5 w-5" />
          </div>
          <h2 className="font-heading text-lg font-bold text-slate-900">
            Courses
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Track assignments and exhibition deadlines tied to your campus.
          </p>
          <p className="mt-4 text-xs font-bold tracking-wide text-inkcuba-orange uppercase">
            Coming soon
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}
