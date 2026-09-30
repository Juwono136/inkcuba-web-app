import { ClipboardCheck, FolderKanban, Sparkles } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/require-role";

export const metadata = {
  title: "Lecturer Dashboard",
};

export default async function LecturerDashboardPage() {
  const session = await requireRole(["LECTURER"]);

  return (
    <DashboardShell
      title="Lecturer Dashboard"
      description="Review student submissions, manage courses, and publish verified portfolios to the exhibition."
    >
      <div className="mb-6 overflow-hidden rounded-2xl border-2 border-inkcuba-navy bg-white shadow-inkcuba">
        <div className="border-b-2 border-inkcuba-navy bg-gradient-to-r from-violet-100 via-fuchsia-50 to-orange-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-inkcuba-navy uppercase">
            <Sparkles className="h-3.5 w-3.5 text-inkcuba-pink" />
            Faculty workspace
          </div>
          <p className="mt-1 font-heading text-xl font-bold text-slate-900 sm:text-2xl">
            {session.user.name}
          </p>
        </div>
        <div className="bg-inkcuba-doodle p-5 sm:p-6">
          <p className="text-sm leading-relaxed text-slate-600">
            Review queues and exhibition tools will live here. Collapse the
            sidebar when you need more room, or open My Settings from Account.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border-2 border-inkcuba-navy bg-gradient-to-br from-violet-50 to-white p-5 shadow-inkcuba">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-inkcuba-navy bg-violet-100 text-inkcuba-purple">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <h2 className="font-heading text-lg font-bold text-slate-900">
            Reviews
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Approve, request revisions, and verify student exhibition work.
          </p>
          <p className="mt-4 text-xs font-bold tracking-wide text-inkcuba-purple uppercase">
            Coming soon
          </p>
        </div>

        <div className="rounded-2xl border-2 border-inkcuba-navy bg-gradient-to-br from-orange-50 to-white p-5 shadow-inkcuba">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-inkcuba-navy bg-orange-100 text-inkcuba-orange">
            <FolderKanban className="h-5 w-5" />
          </div>
          <h2 className="font-heading text-lg font-bold text-slate-900">
            Portfolios
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Publish verified portfolios to the public inkcuba exhibition.
          </p>
          <p className="mt-4 text-xs font-bold tracking-wide text-inkcuba-orange uppercase">
            Coming soon
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}
