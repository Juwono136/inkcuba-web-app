export const ADMIN_SIDEBAR_STORAGE_KEY = "inkcuba.admin-sidebar-collapsed";

export type AdminNavItem = {
  href: string;
  label: string;
  icon:
    | "overview"
    | "settings"
    | "users"
    | "portfolios"
    | "audit"
    | "directory";
  exact?: boolean;
  disabled?: boolean;
  badge?: string;
};

/** Primary console modules (top of sidebar) */
export const ADMIN_PRIMARY_NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/dashboard/admin",
    label: "Overview",
    icon: "overview",
    exact: true,
  },
  {
    href: "/dashboard/admin/users",
    label: "User Management",
    icon: "users",
  },
  {
    href: "/dashboard/admin/directory",
    label: "Directory Options",
    icon: "directory",
  },
  {
    href: "/dashboard/admin/portfolios",
    label: "Portfolios",
    icon: "portfolios",
    disabled: true,
    badge: "Soon",
  },
  {
    href: "/dashboard/admin/audit",
    label: "Audit Logs",
    icon: "audit",
    disabled: true,
    badge: "Soon",
  },
];

/** Account / preferences (pinned to bottom of sidebar) */
export const ADMIN_SECONDARY_NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/dashboard/admin/settings",
    label: "My Settings",
    icon: "settings",
  },
];

/** Flat list for any helper that needs all items */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  ...ADMIN_PRIMARY_NAV_ITEMS,
  ...ADMIN_SECONDARY_NAV_ITEMS,
];

export type AdminBreadcrumbItem = {
  label: string;
  href?: string;
};

export function getAdminBreadcrumbs(pathname: string): AdminBreadcrumbItem[] {
  const crumbs: AdminBreadcrumbItem[] = [
    { label: "Admin", href: "/dashboard/admin" },
  ];

  if (pathname === "/dashboard/admin" || pathname === "/dashboard/admin/") {
    crumbs.push({ label: "Overview" });
    return crumbs;
  }

  if (pathname.startsWith("/dashboard/admin/settings")) {
    crumbs.push({ label: "My Settings" });
    return crumbs;
  }

  if (pathname.startsWith("/dashboard/admin/users")) {
    crumbs.push({ label: "User Management" });
    return crumbs;
  }

  if (pathname.startsWith("/dashboard/admin/directory")) {
    crumbs.push({ label: "Directory Options" });
    return crumbs;
  }

  if (pathname.startsWith("/dashboard/admin/portfolios")) {
    crumbs.push({ label: "Portfolios" });
    return crumbs;
  }

  if (pathname.startsWith("/dashboard/admin/audit")) {
    crumbs.push({ label: "Audit Logs" });
    return crumbs;
  }

  const segments = pathname
    .replace(/^\/dashboard\/admin\/?/, "")
    .split("/")
    .filter(Boolean);

  for (const segment of segments) {
    crumbs.push({
      label: segment
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
    });
  }

  return crumbs;
}
