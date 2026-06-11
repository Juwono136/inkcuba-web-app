import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { redirectIfAuthenticated } from "@/lib/auth/server";

export const metadata = {
  title: "Reset Password",
};

export default async function ResetPasswordPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong password for your inkcuba account. All active sessions will be signed out after resetting."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
