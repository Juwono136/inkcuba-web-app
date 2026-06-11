"use client";

import {
  LayoutDashboard,
  LogOut,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { signOut } from "@/lib/auth/client";
import { getDashboardPath } from "@/lib/auth/redirect";
import { resolveUserRole } from "@/lib/auth/permissions";
import { formatUserRole } from "@/lib/auth/role-labels";
import { cn } from "@/lib/utils";

export type UserMenuUser = {
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
};

type UserMenuProps = {
  user: UserMenuUser;
  onNavigate?: () => void;
  align?: "start" | "center" | "end";
  className?: string;
};

export function UserMenu({
  user,
  onNavigate,
  align = "end",
  className,
}: UserMenuProps) {
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const role = resolveUserRole(user);
  const roleLabel = formatUserRole(role);
  const dashboardPath = getDashboardPath(role);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("Signed out successfully");
            onNavigate?.();
            router.push(AUTH_ROUTES.signIn);
            router.refresh();
          },
        },
      });
    } catch {
      toast.error("Failed to sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  function handleNavigate() {
    onNavigate?.();
  }

  const logoutDialog = (
    <ConfirmDialog
      open={logoutOpen}
      onOpenChange={setLogoutOpen}
      title="Sign out of inkcuba?"
      description="You will need to sign in again with your BINUS email to access your dashboard and portfolio workspace."
      confirmLabel="Sign Out"
      cancelLabel="Stay Signed In"
      variant="destructive"
      onConfirm={handleSignOut}
      loading={isSigningOut}
    />
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "rounded-full outline-none ring-sky-500 transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2",
              className,
            )}
            aria-label="Open account menu"
          >
            <UserAvatar name={user.name} image={user.image} size="md" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={align}
          sideOffset={10}
          className="w-72 rounded-2xl border-2 border-slate-900 p-0 shadow-inkcuba"
        >
          <div className="border-b border-slate-100 px-4 py-4">
            <div className="flex items-center gap-3">
              <UserAvatar name={user.name} image={user.image} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {user.name}
                </p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
                <span className="mt-1.5 inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="p-1.5">
            <DropdownMenuItem asChild className="rounded-xl">
              <Link
                href={dashboardPath}
                onClick={handleNavigate}
                className="flex cursor-pointer items-center gap-2"
              >
                <LayoutDashboard className="h-4 w-4 text-sky-500" />
                Dashboard
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="rounded-xl">
              <Link
                href={`${AUTH_ROUTES.dashboard}/settings`}
                onClick={handleNavigate}
                className="flex cursor-pointer items-center gap-2"
              >
                <Settings className="h-4 w-4 text-sky-500" />
                My Settings
              </Link>
            </DropdownMenuItem>
          </div>

          <DropdownMenuSeparator className="bg-slate-100" />

          <div className="p-1.5">
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                setLogoutOpen(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {logoutDialog}
    </>
  );
}

type MobileUserAccountActionsProps = {
  user: UserMenuUser;
  onNavigate?: () => void;
};

export function MobileUserAccountActions({
  user,
  onNavigate,
}: MobileUserAccountActionsProps) {
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("Signed out successfully");
            onNavigate?.();
            router.push(AUTH_ROUTES.signIn);
            router.refresh();
          },
        },
      });
    } catch {
      toast.error("Failed to sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setLogoutOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="Sign out of inkcuba?"
        description="You will need to sign in again with your BINUS email to access your dashboard and portfolio workspace."
        confirmLabel="Sign Out"
        cancelLabel="Stay Signed In"
        variant="destructive"
        onConfirm={handleSignOut}
        loading={isSigningOut}
      />
    </>
  );
}
