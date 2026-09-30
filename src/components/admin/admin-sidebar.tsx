"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  ListTree,
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
  directory: ListTree,
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
    "group flex w-full max-w-full items-center rounded-xl border-2 text-sm font-semibold transition-colors",
    compact ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
    item.disabled
      ? "cursor-not-allowed border-transparent text-slate-400"
      : active
        ? "border-inkcuba-navy bg-sky-50 text-slate-900 shadow-inkcuba"
        : "border-transparent text-slate-800 hover:border-slate-200 hover:bg-slate-50",
  );

  const content = (
    <>
      <Icon
        className={cn(
          "h-5 w-5 shrink-0",
          item.disabled
            ? "text-slate-300"
            : active
              ? "text-inkcuba-purple"
              : "text-slate-600 group-hover:text-inkcuba-cyan",
        )}
      />
      <span className={cn("min-w-0 truncate", compact && "hidden")}>
        {item.label}
      </span>
      {item.badge ? (
        <span
          className={cn(
            "ml-auto shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-slate-600 uppercase",
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

function AdminSidebarPanel({
  compact,
  onNavigate,
  showClose,
  onClose,
}: {
  compact: boolean;
  onNavigate: () => void;
  showClose?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const showWordmark = !compact;

  return (
    <div className="flex h-full flex-col bg-white">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b-2 border-inkcuba-navy bg-gradient-to-r from-cyan-50 via-violet-50 to-amber-50",
          compact ? "justify-center px-2" : "justify-between gap-2 px-3 sm:px-4",
        )}
      >
        <Link
          href="/dashboard/admin"
          onClick={onNavigate}
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

        {showClose ? (
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <nav className="min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto p-3">
          <p
            className={cn(
              "mb-2 px-2 text-[11px] font-bold tracking-[0.14em] text-slate-600 uppercase",
              compact && "px-0 text-center tracking-widest text-[10px]",
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
              onNavigate={onNavigate}
            />
          ))}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-slate-200 p-3">
          <p
            className={cn(
              "mb-1 px-2 text-[11px] font-bold tracking-[0.14em] text-slate-600 uppercase",
              compact && "px-0 text-center tracking-widest text-[10px]",
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
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminSidebar({
  collapsed,
  mobileOpen,
  onCollapsedChange,
  onMobileOpenChange,
}: AdminSidebarProps) {
  return (
    <>
      {/* Desktop rail — solid, never translucent */}
      <aside
        className={cn(
          "group/sidebar fixed inset-y-0 left-0 z-40 hidden flex-col border-r-2 border-inkcuba-navy bg-white transition-[width] duration-300 ease-out lg:flex",
          collapsed ? "w-20" : "w-72",
        )}
      >
        <AdminSidebarPanel
          compact={collapsed}
          onNavigate={() => undefined}
        />

        <div className="absolute inset-y-0 -right-3 z-[80] hidden w-6 lg:block">
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            className={cn(
              "absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-inkcuba-navy bg-white text-slate-700 shadow-inkcuba",
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

      {/* Mobile / tablet drawer — opaque overlay */}
      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.button
              type="button"
              key="admin-sidebar-backdrop"
              aria-label="Close menu overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-slate-900/55 lg:hidden"
              onClick={() => onMobileOpenChange(false)}
            />
            <motion.aside
              key="admin-sidebar-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Admin console menu"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r-2 border-inkcuba-navy bg-white shadow-2xl lg:hidden"
            >
              <AdminSidebarPanel
                compact={false}
                showClose
                onClose={() => onMobileOpenChange(false)}
                onNavigate={() => onMobileOpenChange(false)}
              />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export function AdminMobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-inkcuba-navy bg-white text-inkcuba-navy shadow-inkcuba transition-colors hover:bg-sky-50 lg:hidden"
      aria-label="Open sidebar"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
