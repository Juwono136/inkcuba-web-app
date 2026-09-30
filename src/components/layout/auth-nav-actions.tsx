"use client";

import { LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";

import { MobileUserAccountActions, UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { siteConfig } from "@/config/site";
import { useLiveSessionUser } from "@/hooks/use-live-session-user";
import { useSession } from "@/lib/auth/client";
import { getDashboardPath, getSettingsPath } from "@/lib/auth/redirect";
import { resolveUserRole } from "@/lib/auth/permissions";
import { formatUserRole } from "@/lib/auth/role-labels";

type AuthNavActionsProps = {
  mobileOpen?: boolean;
  onMobileNavigate?: () => void;
};

export function AuthNavActions({
  mobileOpen = false,
  onMobileNavigate,
}: AuthNavActionsProps) {
  const { data: session, isPending } = useSession();
  const liveUser = useLiveSessionUser({
    name: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
    image: session?.user?.image ?? null,
    role: session?.user?.role ?? null,
  });
  const isAuthenticated = Boolean(session?.user);

  if (isPending) {
    if (mobileOpen) {
      return <div className="mt-3 h-16 animate-pulse rounded-xl bg-slate-100" />;
    }

    return <div className="hidden h-10 w-10 animate-pulse rounded-full bg-slate-100 sm:block" />;
  }

  if (isAuthenticated && session?.user) {
    const role = resolveUserRole(liveUser);
    const dashboardPath = getDashboardPath(role);
    const settingsPath = getSettingsPath(role);

    if (mobileOpen) {
      return (
        <div className="mt-3 space-y-3 rounded-2xl border-2 border-slate-900 bg-slate-50 p-4 shadow-inkcuba">
          <div className="flex items-center gap-3">
            <UserAvatar name={liveUser.name} image={liveUser.image} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {liveUser.name}
              </p>
              <p className="truncate text-xs text-slate-500">{liveUser.email}</p>
              <span className="mt-1 inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                {formatUserRole(role)}
              </span>
            </div>
          </div>

          <div className="grid gap-2">
            <Button asChild variant="outline" className="w-full justify-start border-slate-900">
              <Link href={dashboardPath} onClick={onMobileNavigate}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start border-slate-900">
              <Link href={settingsPath} onClick={onMobileNavigate}>
                <Settings className="h-4 w-4" />
                My Settings
              </Link>
            </Button>
          </div>

          <MobileUserAccountActions user={liveUser} onNavigate={onMobileNavigate} />
        </div>
      );
    }

    return (
      <div className="hidden sm:block">
        <UserMenu user={liveUser} />
      </div>
    );
  }

  if (mobileOpen) {
    return (
      <div className="grid grid-cols-2 gap-2 pt-3">
        <Button asChild variant="outline" className="w-full border-slate-900">
          <Link href={siteConfig.links.signIn}>Sign In</Link>
        </Button>
        <Button asChild className="w-full bg-sky-500 hover:bg-sky-600">
          <Link href={siteConfig.links.signUp}>Get Started</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="hidden border-slate-900 sm:inline-flex"
      >
        <Link href={siteConfig.links.signIn}>Sign In</Link>
      </Button>
      <Button
        asChild
        size="sm"
        className="hidden bg-sky-500 shadow-inkcuba hover:bg-sky-600 hover:shadow-inkcuba-hover sm:inline-flex"
      >
        <Link href={siteConfig.links.signUp}>Get Started</Link>
      </Button>
    </>
  );
}
