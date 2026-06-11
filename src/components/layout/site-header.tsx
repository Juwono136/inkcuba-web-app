"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { useState } from "react";

import { BrandLogo } from "@/components/layout/brand-logo";
import { siteConfig } from "@/config/site";
import { isNavActive } from "@/lib/navigation";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

const AuthNavActions = dynamic(
  () =>
    import("@/components/layout/auth-nav-actions").then(
      (module) => module.AuthNavActions,
    ),
  { ssr: false },
);

const navItems = [
  { label: "Home", href: "/" },
  { label: "Explore", href: siteConfig.links.explore },
  { label: "Courses", href: siteConfig.links.courses },
  { label: "Campus Stats", href: siteConfig.links.stats },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const setSearchOpen = useUiStore((state) => state.setSearchOpen);

  const navLinkClass = (href: string, mobile = false) =>
    cn(
      "text-sm font-medium transition-colors duration-200",
      mobile
        ? "block rounded-lg px-3 py-2.5"
        : "relative py-1",
      isNavActive(pathname, href)
        ? mobile
          ? "bg-sky-50 text-sky-700"
          : "text-sky-600"
        : mobile
          ? "text-slate-700 hover:bg-slate-50"
          : "text-slate-600 hover:text-sky-500",
    );

  return (
    <header className="sticky top-0 z-50 border-b border-slate-900/10 bg-white/95 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0" onClick={() => setMobileOpen(false)}>
          <BrandLogo size="sm" />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex xl:gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClass(item.href)}
            >
              {item.label}
              {isNavActive(pathname, item.href) ? (
                <span className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-sky-500" />
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
            aria-label="Search portfolios"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">Search portfolios...</span>
            <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium lg:inline">
              ⌘K
            </kbd>
          </button>

          <AuthNavActions />

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {mobileOpen ? (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden border-t border-slate-100 bg-white lg:hidden"
          >
            <div className="space-y-1 px-4 py-4 sm:px-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navLinkClass(item.href, true)}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setMobileOpen(false);
                  setSearchOpen(true);
                }}
              >
                <Search className="h-4 w-4" />
                Search portfolios
              </button>

              <AuthNavActions
                mobileOpen
                onMobileNavigate={() => setMobileOpen(false)}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
