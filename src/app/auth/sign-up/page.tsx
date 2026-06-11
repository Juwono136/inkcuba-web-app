import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { redirectIfAuthenticated } from "@/lib/auth/server";

export const metadata = {
  title: "Get Started",
};

export default async function SignUpPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell
      title="Create your account"
      subtitle="Register with your BINUS email to join the verified academic portfolio platform."
      footer={
        <p>
          By creating an account, you agree to use only institutional BINUS
          credentials (@binus.edu or @binus.ac.id).
        </p>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
