import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * Root dashboard layout — chrome is provided by nested layouts:
 * - `(workspace)` → public SiteHeader/SiteFooter (student/lecturer/settings)
 * - `admin` → AdminShell (sidebar + admin navbar)
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
