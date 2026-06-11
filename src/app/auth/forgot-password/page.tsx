import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { redirectIfAuthenticated } from "@/lib/auth/server";

export const metadata = {
  title: "Forgot Password",
};

export default async function ForgotPasswordPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your BINUS institutional email and we'll send you a secure link to reset your password."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
