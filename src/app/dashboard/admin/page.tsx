import {
  ClipboardList,
  FolderKanban,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/require-role";

export const metadata = {
  title: "Admin Dashboard",
};

const upcomingModules = [
  {
    title: "User Management",
    description: "Review accounts, roles, campus, and BINUSIAN identity fields.",
    icon: Users,
    href: "/dashboard/admin/users",
  },
  {
    title: "Portfolio Moderation",
    description: "Override exhibition content and handle take-down requests.",
    icon: FolderKanban,
    href: "/dashboard/admin/portfolios",
  },
  {
    title: "Audit Logs",
    description: "Trace security-sensitive actions across the platform.",
    icon: ClipboardList,
    href: "/dashboard/admin/audit",
  },
];

export default async function AdminDashboardPage() {
  const session = await requireRole(["ADMIN"]);

  return (
    <div>
      <AdminPageHeader
        title="Overview"
        description="Oversee platform operations, user management, and institutional exhibition settings."
        actions={
          <Button asChild className="bg-sky-500 shadow-inkcuba hover:bg-sky-600">
            <Link href="/dashboard/admin/settings">
              <Settings className="h-4 w-4" />
              My Settings
            </Link>
          </Button>
        }
      />

      <div className="mb-6 rounded-2xl border-2 border-slate-900 bg-white p-5 shadow-inkcuba sm:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-sky-50 text-sky-700">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <p className="font-heading text-lg font-bold text-slate-900">
              Welcome, {session.user.name}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              You are signed in to the inkcuba administration console. Use the
              sidebar to navigate modules. Collapse it anytime for a wider
              workspace on larger screens.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {upcomingModules.map((module, index) => {
          const Icon = module.icon;

          return (
            <div
              key={module.title}
              className="rounded-2xl border-2 border-slate-900 bg-white p-5 shadow-inkcuba"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-900 bg-slate-50">
                <Icon className="h-5 w-5 text-sky-600" />
              </div>
              <h2 className="font-heading text-lg font-bold text-slate-900">
                {module.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {module.description}
              </p>
              <p className="mt-4 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Coming soon
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
