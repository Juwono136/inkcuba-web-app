"use client";

import {
  AppBreadcrumb,
  type AppBreadcrumbItem,
} from "@/components/layout/app-breadcrumb";
import type { AdminBreadcrumbItem } from "@/lib/admin/nav";

type AdminBreadcrumbProps = {
  items: AdminBreadcrumbItem[];
  className?: string;
};

export function AdminBreadcrumb({ items, className }: AdminBreadcrumbProps) {
  return (
    <AppBreadcrumb items={items as AppBreadcrumbItem[]} className={className} />
  );
}
