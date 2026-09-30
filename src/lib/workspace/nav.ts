export const WORKSPACE_SIDEBAR_STORAGE_KEY = "inkcuba.workspace-sidebar-open";

export type WorkspaceRole = "STUDENT" | "LECTURER";

export type WorkspaceNavItem = {
  href: string;
  label: string;
  icon: "overview" | "settings" | "portfolios" | "reviews";
  exact?: boolean;
  disabled?: boolean;
  badge?: string;
};

export type WorkspaceBreadcrumbItem = {
  label: string;
  href?: string;
};

export function getWorkspaceHomePath(role: WorkspaceRole): string {
  return role === "LECTURER" ? "/dashboard/lecturer" : "/dashboard/student";
}

export function getWorkspacePrimaryNav(
  role: WorkspaceRole,
): WorkspaceNavItem[] {
  const home = getWorkspaceHomePath(role);

  if (role === "LECTURER") {
    return [
      {
        href: home,
        label: "Overview",
        icon: "overview",
        exact: true,
      },
      {
        href: "/dashboard/lecturer/reviews",
        label: "Reviews",
        icon: "reviews",
        disabled: true,
        badge: "Soon",
      },
      {
        href: "/dashboard/lecturer/portfolios",
        label: "Portfolios",
        icon: "portfolios",
        disabled: true,
        badge: "Soon",
      },
    ];
  }

  return [
    {
      href: home,
      label: "Overview",
      icon: "overview",
      exact: true,
    },
    {
      href: "/dashboard/student/portfolios",
      label: "Portfolios",
      icon: "portfolios",
      disabled: true,
      badge: "Soon",
    },
  ];
}

export function getWorkspaceSecondaryNav(): WorkspaceNavItem[] {
  return [
    {
      href: "/dashboard/settings",
      label: "My Settings",
      icon: "settings",
    },
  ];
}

export function getWorkspaceBreadcrumbs(
  pathname: string,
  role: WorkspaceRole,
): WorkspaceBreadcrumbItem[] {
  const home = getWorkspaceHomePath(role);
  const roleLabel = role === "LECTURER" ? "Lecturer" : "Student";

  const crumbs: WorkspaceBreadcrumbItem[] = [
    { label: roleLabel, href: home },
  ];

  if (pathname === home || pathname === `${home}/`) {
    crumbs.push({ label: "Overview" });
    return crumbs;
  }

  if (pathname.startsWith("/dashboard/settings")) {
    crumbs.push({ label: "My Settings" });
    return crumbs;
  }

  if (pathname.includes("/portfolios")) {
    crumbs.push({ label: "Portfolios" });
    return crumbs;
  }

  if (pathname.includes("/reviews")) {
    crumbs.push({ label: "Reviews" });
    return crumbs;
  }

  const segments = pathname
    .replace(/^\/dashboard\/(student|lecturer)\/?/, "")
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
