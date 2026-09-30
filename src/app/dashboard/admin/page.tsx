import {
  ClipboardList,
  FolderKanban,
  Settings,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/require-role";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Admin Dashboard",
};

const modules = [
  {
    title: "User Management",
    description: "Review accounts, roles, campus, and BINUSIAN identity fields.",
    href: "/dashboard/admin/users",
    icon: Users,
    cardClass: "from-sky-50 to-white",
    iconClass: "bg-sky-100 text-inkcuba-cyan",
    available: true,
  },
  {
    title: "Portfolio Moderation",
    description: "Override exhibition content and handle take-down requests.",
    href: null,
    icon: FolderKanban,
    cardClass: "from-violet-50 to-white",
    iconClass: "bg-violet-100 text-inkcuba-purple",
    available: false,
  },
  {
    title: "Audit Logs",
    description: "Trace security-sensitive actions across the platform.",
    href: null,
    icon: ClipboardList,
    cardClass: "from-amber-50 to-white",
    iconClass: "bg-amber-100 text-inkcuba-orange",
    available: false,
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
          <Button
            asChild
            className="bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600"
          >
            <Link href="/dashboard/admin/settings">
              <Settings className="h-4 w-4" />
              My Settings
            </Link>
          </Button>
        }
      />

      <div className="mb-6 overflow-hidden rounded-2xl border-2 border-inkcuba-navy bg-white shadow-inkcuba">
        <div className="border-b-2 border-inkcuba-navy bg-gradient-to-r from-cyan-100 via-violet-100 to-orange-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-inkcuba-navy uppercase">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Administration console
          </div>
          <p className="mt-1 font-heading text-xl font-bold text-slate-900 sm:text-2xl">
            Welcome, {session.user.name}
          </p>
        </div>
        <div className="flex items-start gap-3 bg-inkcuba-doodle p-5 sm:p-6">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-inkcuba-navy bg-gradient-to-br from-sky-100 to-violet-100 text-inkcuba-purple">
            <Shield className="h-5 w-5" />
          </span>
          <p className="text-sm leading-relaxed text-slate-600">
            You are signed in to the inkcuba administration console. Use the
            sidebar to navigate modules. Collapse it anytime for a wider
            workspace on larger screens.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;
          const body = (
            <>
              <div
                className={cn(
                  "mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-inkcuba-navy",
                  module.iconClass,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="font-heading text-lg font-bold text-slate-900">
                {module.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {module.description}
              </p>
              <p className="mt-4 text-xs font-bold tracking-wide text-slate-400 uppercase">
                {module.available ? "Open module" : "Coming soon"}
              </p>
            </>
          );

          if (module.href) {
            return (
              <Link
                key={module.title}
                href={module.href}
                className={cn(
                  "rounded-2xl border-2 border-inkcuba-navy bg-gradient-to-br p-5 shadow-inkcuba transition-transform hover:-translate-y-0.5",
                  module.cardClass,
                )}
              >
                {body}
              </Link>
            );
          }

          return (
            <div
              key={module.title}
              className={cn(
                "rounded-2xl border-2 border-inkcuba-navy bg-gradient-to-br p-5 shadow-inkcuba",
                module.cardClass,
              )}
            >
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
