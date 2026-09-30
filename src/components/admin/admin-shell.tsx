"use client";

import { useEffect, useState } from "react";

import { AdminFooter } from "@/components/admin/admin-footer";
import { AdminNavbar } from "@/components/admin/admin-navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ADMIN_SIDEBAR_STORAGE_KEY } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";

type AdminShellProps = {
  user: {
    name: string;
    email: string;
    image?: string | null;
    role?: string | null;
  };
  children: React.ReactNode;
};

const DESKTOP_MQ = "(min-width: 1024px)";

export function AdminShell({ user, children }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ADMIN_SIDEBAR_STORAGE_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      // ignore storage failures
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_MQ);

    function onChange(event: MediaQueryListEvent | MediaQueryList) {
      if (event.matches) setMobileOpen(false);
    }

    onChange(media);
    media.addEventListener("change", onChange);
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

  function handleCollapsedChange(next: boolean) {
    setCollapsed(next);
    try {
      localStorage.setItem(ADMIN_SIDEBAR_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // ignore storage failures
    }
  }

  return (
    <div className="min-h-screen bg-inkcuba-dashboard">
      <AdminSidebar
        collapsed={hydrated ? collapsed : false}
        mobileOpen={mobileOpen}
        onCollapsedChange={handleCollapsedChange}
        onMobileOpenChange={setMobileOpen}
      />

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-300 ease-out",
          hydrated && collapsed ? "lg:pl-20" : "lg:pl-72",
        )}
      >
        <AdminNavbar
          user={user}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <AdminFooter />
      </div>
    </div>
  );
}
