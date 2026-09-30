"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/layout/brand-logo";
import {
  ADMIN_PRIMARY_NAV_ITEMS,
  ADMIN_SECONDARY_NAV_ITEMS,
  type AdminNavItem,
} from "@/lib/admin/nav";
import { cn } from "@/lib/utils";

const ICONS = {
  overview: LayoutDashboard,
  settings: Settings,
  users: Users,
  portfolios: FolderKanban,
  audit: ClipboardList,
} as const;

type AdminSidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onMobileOpenChange: (open: boolean) => void;
};

function isActive(pathname: string, item: AdminNavItem) {
  if (item.exact) {
    return pathname === item.href || pathname === `${item.href}/`;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavItemRow({
  item,
  pathname,
  compact,
  onNavigate,
}: {
  item: AdminNavItem;
  pathname: string;
  compact: boolean;
  onNavigate: () => void;
}) {
  const Icon = ICONS[item.icon];
  const active = isActive(pathname, item);

  const className = cn(
    "group flex w-full max-w-full items-center rounded-xl border-2 text-sm font-semibold transition-all",
    compact ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
    item.disabled
      ? "cursor-not-allowed border-transparent text-slate-400"
      : active
        ? "border-slate-900 bg-sky-50 text-slate-900 shadow-inkcuba"
        : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900",
  );

  const content = (
    <>
      <Icon
        className={cn(
          "h-5 w-5 shrink-0",
          active ? "text-sky-600" : "text-slate-400 group-hover:text-sky-500",
        )}
      />
      <span className={cn("min-w-0 truncate", compact && "hidden")}>
        {item.label}
      </span>
      {item.badge ? (
        <span
          className={cn(
            "ml-auto shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-slate-500 uppercase",
            compact && "hidden",
          )}
        >
          {item.badge}
        </span>
      ) : null}
    </>
  );

  if (item.disabled) {
    return (
      <div
        className={className}
        aria-disabled
        title={compact ? `${item.label} (Soon)` : undefined}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={className}
      aria-current={active ? "page" : undefined}
      title={compact ? item.label : undefined}
    >
      {content}
    </Link>
  );
}

export function AdminSidebar({
  collapsed,
  mobileOpen,
  onCollapsedChange,
  onMobileOpenChange,
}: AdminSidebarProps) {
  const pathname = usePathname();
  // Expanded labels on mobile drawer; icon-only only when desktop-collapsed
  const compact = collapsed && !mobileOpen;
  const showWordmark = mobileOpen || !collapsed;

  return (
    <>
      <AnimatePresence>
        {mobileOpen ? (
          <motion.button
            type="button"
            aria-label="Close sidebar overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
            onClick={() => onMobileOpenChange(false)}
          />
        ) : null}
      </AnimatePresence>

      <aside
        className={cn(
          "group/sidebar fixed inset-y-0 left-0 z-50 flex flex-col overflow-visible border-r-2 border-slate-900 bg-white transition-[width,transform] duration-300 ease-out",
          compact ? "lg:w-20" : "lg:w-72",
          mobileOpen
            ? "w-[min(18rem,88vw)] translate-x-0"
            : "-translate-x-full w-72 lg:translate-x-0",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center overflow-hidden border-b-2 border-slate-900",
            compact ? "justify-center px-2" : "justify-between gap-2 px-3 sm:px-4",
          )}
        >
          <Link
            href="/dashboard/admin"
            onClick={() => onMobileOpenChange(false)}
            className={cn(
              "flex min-w-0 items-center overflow-hidden",
              compact && "justify-center",
            )}
          >
            <BrandLogo
              size="sm"
              showWordmark={showWordmark}
              className={cn("max-w-full", compact ? "gap-0" : "gap-2")}
            />
          </Link>

          <button
            type="button"
            className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            onClick={() => onMobileOpenChange(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-none">
          <nav className="min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto p-2.5 sm:p-3">
            <p
              className={cn(
                "mb-2 truncate px-2 text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase",
                compact && "px-0 text-center tracking-widest",
              )}
            >
              {compact ? "App" : "Console"}
            </p>

            {ADMIN_PRIMARY_NAV_ITEMS.map((item) => (
              <NavItemRow
                key={item.href}
                item={item}
                pathname={pathname}
                compact={compact}
                onNavigate={() => onMobileOpenChange(false)}
              />
            ))}
          </nav>

          <div className="shrink-0 space-y-1 overflow-hidden border-t border-slate-200 p-2.5 sm:p-3">
            <p
              className={cn(
                "mb-1 truncate px-2 text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase",
                compact && "px-0 text-center tracking-widest",
              )}
            >
              {compact ? "Me" : "Account"}
            </p>
            {ADMIN_SECONDARY_NAV_ITEMS.map((item) => (
              <NavItemRow
                key={item.href}
                item={item}
                pathname={pathname}
                compact={compact}
                onNavigate={() => onMobileOpenChange(false)}
              />
            ))}
          </div>
        </div>

        {/*
          Desktop collapse control:
          - Sits on a hover rail along the sidebar edge (above main content)
          - Hidden by default; fades/slides in when the sidebar (or edge) is hovered / focused
        */}
        <div className="absolute inset-y-0 -right-3 z-[80] hidden w-6 lg:block">
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            className={cn(
              "absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-slate-900 bg-white text-slate-700 shadow-inkcuba",
              "opacity-0 scale-90",
              "transition-[opacity,transform,background-color,color] duration-200 ease-out",
              "group-hover/sidebar:opacity-100 group-hover/sidebar:scale-100",
              "hover:bg-sky-50 hover:text-sky-700",
              "focus-visible:opacity-100 focus-visible:scale-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

type AdminMobileMenuButtonProps = {
  onClick: () => void;
};

export function AdminMobileMenuButton({ onClick }: AdminMobileMenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-white text-slate-900 shadow-inkcuba transition-colors hover:bg-slate-50 lg:hidden"
      aria-label="Open sidebar"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
