import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { SessionExpiredNotice } from "@/components/auth/session-expired-notice";
import { SignInForm } from "@/components/auth/sign-in-form";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import { getSafeInternalPath } from "@/lib/auth/safe-callback";
import { redirectIfAuthenticated } from "@/lib/auth/server";

export const metadata = {
  title: "Sign In",
};

type PageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function SignInPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const callbackUrl = getSafeInternalPath(params.callbackUrl);
  await redirectIfAuthenticated(callbackUrl);

  const joiningWorkspace = Boolean(
    callbackUrl?.startsWith("/join") || callbackUrl?.includes("/join?"),
  );

  return (
    <AuthShell
      title="Welcome back"
      subtitle={
        joiningWorkspace
          ? "Sign in with your BINUS institutional email to continue joining your workspace."
          : "Sign in with your BINUS institutional email to access your dashboard and portfolio workspace."
      }
    >
      <Suspense fallback={<InkcubaLoader label="Loading sign in..." />}>
        <SessionExpiredNotice />
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
