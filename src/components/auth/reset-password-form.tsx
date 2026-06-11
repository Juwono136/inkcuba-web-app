"use client";

import { ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/auth/password-input";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { resetPassword } from "@/lib/auth/client";
import { resetPasswordSchema } from "@/lib/validators/password-reset";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";

function ResetPasswordFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const errorParam = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isInvalidToken =
    errorParam === "INVALID_TOKEN" || (!token && Boolean(errorParam));

  useEffect(() => {
    if (isInvalidToken) {
      toast.error("This reset link is invalid or has expired.");
    }
  }, [isInvalidToken]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});

    if (!token) {
      toast.error("Reset token is missing. Please use the link from your email.");
      return;
    }

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? "form";
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword({
        newPassword: parsed.data.password,
        token,
      });

      if (result.error) {
        toast.error(
          result.error.message ??
            "Unable to reset your password. The link may have expired.",
        );
        return;
      }

      toast.success("Password reset successfully! Please sign in.");
      router.push(AUTH_ROUTES.signIn);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <InkcubaLoader fullScreen label="Updating your password..." />;
  }

  if (!token || isInvalidToken) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-slate-900 bg-red-50 shadow-inkcuba">
          <ShieldAlert className="h-8 w-8 text-red-500" />
        </div>
        <div className="space-y-2">
          <h3 className="font-heading text-xl font-bold text-slate-900">
            Link expired or invalid
          </h3>
          <p className="text-sm leading-relaxed text-slate-600">
            This password reset link is no longer valid. Please request a new
            one to continue.
          </p>
        </div>
        <div className="grid gap-2">
          <Button asChild className="w-full bg-sky-500 hover:bg-sky-600">
            <Link href={AUTH_ROUTES.forgotPassword}>Request New Link</Link>
          </Button>
          <Button asChild variant="outline" className="w-full border-slate-900">
            <Link href={AUTH_ROUTES.signIn}>
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          placeholder="Min. 8 chars with upper, lower & number"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(errors.password)}
        />
        <PasswordRequirements password={password} />
        {errors.password ? (
          <p className="text-xs text-red-500">{errors.password}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-new-password">Confirm New Password</Label>
        <PasswordInput
          id="confirm-new-password"
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          aria-invalid={Boolean(errors.confirmPassword)}
        />
        {errors.confirmPassword ? (
          <p className="text-xs text-red-500">{errors.confirmPassword}</p>
        ) : null}
      </div>

      <Button
        type="submit"
        className="w-full bg-sky-500 shadow-inkcuba hover:bg-sky-600 hover:shadow-inkcuba-hover"
        size="lg"
      >
        Reset Password
      </Button>

      <p className="text-center text-sm text-slate-600">
        <Link
          href={AUTH_ROUTES.signIn}
          className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Sign In
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={<InkcubaLoader label="Loading reset form..." />}>
      <ResetPasswordFormInner />
    </Suspense>
  );
}
