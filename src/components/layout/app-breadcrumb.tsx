"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type AppBreadcrumbItem = {
  label: string;
  href?: string;
};

type AppBreadcrumbProps = {
  items: AppBreadcrumbItem[];
  className?: string;
};

export function AppBreadcrumb({ items, className }: AppBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0 overflow-hidden", className)}>
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 max-w-full items-center gap-1">
              {index > 0 ? (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-slate-400"
                  aria-hidden
                />
              ) : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="max-w-[9rem] truncate font-medium text-slate-500 transition-colors hover:text-sky-600 sm:max-w-[14rem]"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "max-w-[10rem] truncate font-semibold sm:max-w-none",
                    isLast ? "text-slate-900" : "text-slate-500",
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
