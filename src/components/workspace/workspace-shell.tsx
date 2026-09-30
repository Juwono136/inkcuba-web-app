"use client";

import { useEffect, useState } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { WorkspaceToolbar } from "@/components/workspace/workspace-toolbar";
import {
  WORKSPACE_SIDEBAR_STORAGE_KEY,
  type WorkspaceRole,
} from "@/lib/workspace/nav";

type WorkspaceShellProps = {
  role: WorkspaceRole;
  children: React.ReactNode;
};

const DESKTOP_MQ = "(min-width: 1024px)";

/**
 * Student/lecturer chrome:
 * - Public SiteHeader / SiteFooter
 * - Desktop (≥ lg): sticky sidebar beside content (viewport-height; Account under Navigate)
 * - Mobile (< lg): solid overlay drawer; main column always full width
 */
export function WorkspaceShell({ role, children }: WorkspaceShellProps) {
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(WORKSPACE_SIDEBAR_STORAGE_KEY);
      if (stored === "0") setDesktopOpen(false);
      if (stored === "1") setDesktopOpen(true);
    } catch {
      // ignore
    }

    const media = window.matchMedia(DESKTOP_MQ);

    function syncDesktop(matches: boolean) {
      setIsDesktop(matches);
      if (!matches) setMobileOpen(false);
    }

    syncDesktop(media.matches);
    const onChange = (event: MediaQueryListEvent) => syncDesktop(event.matches);
    media.addEventListener("change", onChange);
    setHydrated(true);

    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  function handleToggle() {
    if (isDesktop) {
      setDesktopOpen((prev) => {
        const next = !prev;
        try {
          localStorage.setItem(
            WORKSPACE_SIDEBAR_STORAGE_KEY,
            next ? "1" : "0",
          );
        } catch {
          // ignore
        }
        return next;
      });
      return;
    }

    setMobileOpen((prev) => !prev);
  }

  const toggleShowsOpen = isDesktop ? desktopOpen : mobileOpen;

  return (
    <div className="min-h-screen bg-inkcuba-dashboard">
      <SiteHeader />

      <div className="flex w-full min-h-[calc(100vh-4rem)]">
        <WorkspaceSidebar
          role={role}
          desktopOpen={hydrated ? desktopOpen : true}
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <WorkspaceToolbar
            role={role}
            sidebarOpen={hydrated ? toggleShowsOpen : true}
            onToggleSidebar={handleToggle}
          />
          <div className="w-full min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
