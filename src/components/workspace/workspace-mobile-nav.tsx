"use client";

import {
  FolderKanban,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  getWorkspacePrimaryNav,
  getWorkspaceSecondaryNav,
  type WorkspaceNavItem,
  type WorkspaceRole,
} from "@/lib/workspace/nav";
import { cn } from "@/lib/utils";

const ICONS = {
  overview: LayoutDashboard,
  settings: Settings,
  portfolios: FolderKanban,
  workspaces: FolderKanban,
} as const;

function isActive(pathname: string, item: WorkspaceNavItem) {
  if (item.exact) {
    return pathname === item.href || pathname === `${item.href}/`;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Mobile-first bottom tab bar for student/lecturer workspace chrome.
 * Mirrors the sidebar destinations so small screens feel like a native app.
 */
export function WorkspaceMobileNav({ role }: { role: WorkspaceRole }) {
  const pathname = usePathname();
  const items = [...getWorkspacePrimaryNav(role), ...getWorkspaceSecondaryNav()];

  return (
    <nav
      aria-label="Workspace shortcuts"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-inkcuba-navy bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
    >
      <ul
        className={cn(
          "mx-auto grid max-w-lg gap-1 px-2 pt-2",
          items.length >= 4 ? "grid-cols-4" : "grid-cols-3",
        )}
      >
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(pathname, item);
          return (
            <li key={item.href} className="min-w-0">
              {item.disabled ? (
                <div className="flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-slate-400">
                  <Icon className="h-5 w-5" />
                  <span className="truncate text-[10px] font-semibold">{item.label}</span>
                </div>
              ) : (
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors",
                    active
                      ? "bg-sky-50 text-inkcuba-navy"
                      : "text-slate-600 active:bg-slate-50",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      active ? "text-inkcuba-purple" : "text-slate-500",
                    )}
                  />
                  <span className="max-w-full truncate text-[10px] font-semibold leading-tight">
                    {item.label}
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
