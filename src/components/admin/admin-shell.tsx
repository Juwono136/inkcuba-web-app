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

  function handleCollapsedChange(next: boolean) {
    setCollapsed(next);
    try {
      localStorage.setItem(ADMIN_SIDEBAR_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // ignore storage failures
    }
  }

  useEffect(() => {
    if (!mobileOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F1F5F9_45%,#EEF6FF_100%)]">
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
