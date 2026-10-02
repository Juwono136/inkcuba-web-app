import Link from "next/link";

import { JoinAuthenticatedClient } from "@/components/student/join/join-authenticated-client";
import { JoinGateLanding } from "@/components/student/join/join-gate-landing";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { getDashboardPath } from "@/lib/auth/redirect";
import { resolveUserRole } from "@/lib/auth/permissions";
import { getSafeInternalPath } from "@/lib/auth/safe-callback";
import { getSession } from "@/lib/auth/session";
import {
  normalizeWorkspaceInviteCode,
  INVITE_CODE_PATTERN,
} from "@/lib/workspaces/members/types";
import { getWorkspaceInvitePreview } from "@/lib/workspaces/student-service";

export const metadata = {
  title: "Join workspace",
};

type PageProps = {
  searchParams: Promise<{ code?: string }>;
};

export default async function JoinPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawCode = params.code ?? "";
  const code = normalizeWorkspaceInviteCode(rawCode);
  const validCode = INVITE_CODE_PATTERN.test(code) ? code : "";
  const preview = validCode
    ? await getWorkspaceInvitePreview(validCode)
    : null;

  const session = await getSession();
  const callbackPath = `/join${validCode ? `?code=${encodeURIComponent(validCode)}` : ""}`;
  const safeCallback = getSafeInternalPath(callbackPath) ?? "/join";
  const signInHref = `${AUTH_ROUTES.signIn}?callbackUrl=${encodeURIComponent(safeCallback)}`;

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-inkcuba-doodle">
        {!session?.user ? (
          <JoinGateLanding
            code={validCode || rawCode.trim().toLowerCase()}
            preview={preview}
            signInHref={signInHref}
          />
        ) : resolveUserRole(session.user) !== "STUDENT" ? (
          <div className="mx-auto max-w-md space-y-4 px-4 py-12 text-center">
            <h1 className="font-heading text-2xl font-bold text-slate-900">
              Student accounts only
            </h1>
            <p className="text-sm text-slate-600">
              This invite link is for students. Switch to a student account, or
              open your own dashboard.
            </p>
            <Button asChild className="bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600">
              <Link href={getDashboardPath(resolveUserRole(session.user))}>
                Go to dashboard
              </Link>
            </Button>
          </div>
        ) : (
          <JoinAuthenticatedClient
            initialCode={validCode}
            preview={preview}
          />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
