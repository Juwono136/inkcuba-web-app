"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  FolderKanban,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
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

const SIDEBAR_WIDTH_CLASS = "w-64"; // 16rem — stable on all desktop sizes

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

function NavItemRow({
  item,
  pathname,
  onNavigate,
}: {
  item: WorkspaceNavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const Icon = ICONS[item.icon];
  const active = isActive(pathname, item);

  const className = cn(
    "group flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-colors",
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
          active
            ? "text-inkcuba-purple"
            : "text-slate-600 group-hover:text-inkcuba-cyan",
        )}
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-slate-600 uppercase">
          {item.badge}
        </span>
      ) : null}
    </>
  );

  if (item.disabled) {
    return (
      <div className={className} aria-disabled>
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
    >
      {content}
    </Link>
  );
}

function SidebarPanel({
  role,
  onNavigate,
  onClose,
  showClose,
}: {
  role: WorkspaceRole;
  onNavigate?: () => void;
  onClose?: () => void;
  showClose?: boolean;
}) {
  const pathname = usePathname();
  const primary = getWorkspacePrimaryNav(role);
  const secondary = getWorkspaceSecondaryNav();

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-violet-50 to-amber-50 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[0.14em] text-inkcuba-navy uppercase">
            Workspace menu
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            {role === "LECTURER" ? "Lecturer" : "Student"}
          </p>
        </div>
        {showClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className="space-y-1 overflow-y-auto p-3">
        <p className="mb-2 px-2 text-[11px] font-bold tracking-[0.14em] text-slate-500 uppercase">
          Navigate
        </p>
        {primary.map((item) => (
          <NavItemRow
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}

        <div className="mt-4 space-y-1 border-t border-slate-200 pt-3">
          <p className="mb-1 px-2 text-[11px] font-bold tracking-[0.14em] text-slate-500 uppercase">
            Account
          </p>
          {secondary.map((item) => (
            <NavItemRow
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}

type WorkspaceSidebarProps = {
  role: WorkspaceRole;
  /** Desktop (≥ lg): sticky sidebar open state */
  desktopOpen: boolean;
  /** Mobile (< lg): overlay drawer open state */
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
};

/**
 * Responsive workspace nav:
 * - Mobile: solid overlay drawer (content stays full-width)
 * - Desktop: sticky sidebar column (stays visible while scrolling; content reflows beside it)
 */
export function WorkspaceSidebar({
  role,
  desktopOpen,
  mobileOpen,
  onMobileOpenChange,
}: WorkspaceSidebarProps) {
  return (
    <>
      {/* Desktop sticky sidebar — height capped to viewport so Account stays near Navigate */}
      <aside
        className={cn(
          "relative hidden shrink-0 self-start overflow-hidden border-inkcuba-navy bg-white transition-[width] duration-300 ease-out lg:block",
          desktopOpen
            ? cn(SIDEBAR_WIDTH_CLASS, "sticky top-16 z-30 h-[calc(100vh-4rem)] border-r-2")
            : "w-0 border-r-0",
        )}
        aria-hidden={!desktopOpen}
      >
        <div className={cn("h-full overflow-y-auto", SIDEBAR_WIDTH_CLASS)}>
          <SidebarPanel role={role} />
        </div>
      </aside>

      {/* Mobile overlay drawer */}
      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.button
              type="button"
              key="workspace-sidebar-backdrop"
              aria-label="Close menu overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
              onClick={() => onMobileOpenChange(false)}
            />
            <motion.aside
              key="workspace-sidebar-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Workspace menu"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r-2 border-inkcuba-navy bg-white shadow-xl lg:hidden"
            >
              <SidebarPanel
                role={role}
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

export function WorkspaceSidebarToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-inkcuba-navy bg-white text-inkcuba-navy shadow-inkcuba transition-colors hover:bg-sky-50"
      aria-label={open ? "Hide workspace menu" : "Show workspace menu"}
      aria-pressed={open}
      title={open ? "Hide menu" : "Show menu"}
    >
      {open ? (
        <PanelLeftClose className="h-5 w-5" />
      ) : (
        <PanelLeftOpen className="h-5 w-5" />
      )}
    </button>
  );
}
