"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminMobileMenuButton } from "@/components/admin/admin-sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { getAdminBreadcrumbs } from "@/lib/admin/nav";

type AdminNavbarProps = {
  user: {
    name: string;
    email: string;
    image?: string | null;
    role?: string | null;
  };
  onOpenMobileSidebar: () => void;
};

export function AdminNavbar({ user, onOpenMobileSidebar }: AdminNavbarProps) {
  const pathname = usePathname();
  const breadcrumbs = getAdminBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-30 border-b-2 border-slate-900 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <AdminMobileMenuButton onClick={onOpenMobileSidebar} />

        <div className="min-w-0 flex-1">
          <AdminBreadcrumb items={breadcrumbs} />
          <p className="mt-0.5 hidden truncate text-xs text-slate-500 sm:block">
            inkcuba administration console
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-slate-900 bg-white shadow-none hover:bg-sky-50"
          >
            <Link href="/" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Public site</span>
              <span className="sm:hidden">Public</span>
            </Link>
          </Button>
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
