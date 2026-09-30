"use client";

import { usePathname } from "next/navigation";

import { AppBreadcrumb } from "@/components/layout/app-breadcrumb";
import { WorkspaceSidebarToggle } from "@/components/workspace/workspace-sidebar";
import {
  getWorkspaceBreadcrumbs,
  type WorkspaceRole,
} from "@/lib/workspace/nav";

type WorkspaceToolbarProps = {
  role: WorkspaceRole;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
};

/** Breadcrumb strip + sidebar show/hide control (all breakpoints). */
export function WorkspaceToolbar({
  role,
  sidebarOpen,
  onToggleSidebar,
}: WorkspaceToolbarProps) {
  const pathname = usePathname();
  const breadcrumbs = getWorkspaceBreadcrumbs(pathname, role);

  return (
    <div className="sticky top-16 z-20 border-b border-slate-200 bg-white">
      <div className="flex h-12 items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <WorkspaceSidebarToggle open={sidebarOpen} onToggle={onToggleSidebar} />
        <AppBreadcrumb items={breadcrumbs} className="min-w-0 flex-1" />
      </div>
    </div>
  );
}
