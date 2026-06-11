import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { SessionExpiredNotice } from "@/components/auth/session-expired-notice";
import { SignInForm } from "@/components/auth/sign-in-form";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import { redirectIfAuthenticated } from "@/lib/auth/server";

export const metadata = {
  title: "Sign In",
};

export default async function SignInPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in with your BINUS institutional email to access your dashboard and portfolio workspace."
    >
      <Suspense fallback={<InkcubaLoader label="Loading sign in..." />}>
        <SessionExpiredNotice />
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
