import Link from "next/link";

import { BrandLogo } from "@/components/layout/brand-logo";
import { siteConfig } from "@/config/site";

export function AdminFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <BrandLogo size="sm" showWordmark />
          <p className="text-xs text-slate-500">
            Admin console — {siteConfig.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
          <Link href="/" className="font-medium transition-colors hover:text-sky-600">
            Public site
          </Link>
          <span>© {new Date().getFullYear()} inkcuba</span>
        </div>
      </div>
    </footer>
  );
}
