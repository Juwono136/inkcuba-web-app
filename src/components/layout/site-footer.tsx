import Link from "next/link";

import { BrandLogo } from "@/components/layout/brand-logo";
import { siteConfig } from "@/config/site";

const footerLinks = [
  { label: "Home", href: "/" },
  { label: "Explore", href: siteConfig.links.explore },
  { label: "Courses", href: siteConfig.links.courses },
  { label: "Campus Stats", href: siteConfig.links.stats },
  { label: "Sign In", href: siteConfig.links.signIn },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="space-y-3">
          <BrandLogo size="sm" />
          <p className="max-w-sm text-sm leading-relaxed text-slate-500">
            Verified academic portfolio platform for BINUS University students,
            lecturers, and public discovery.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-sky-500"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} inkcuba. Copyright reserved.
      </div>
    </footer>
  );
}
