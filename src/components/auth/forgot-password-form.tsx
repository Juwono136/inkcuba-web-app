"use client";

import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientEnv } from "@/config/env-client";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { requestPasswordReset } from "@/lib/auth/client";
import { forgotPasswordSchema } from "@/lib/validators/password-reset";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});

    const parsed = forgotPasswordSchema.safeParse({ email });

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
      const result = await requestPasswordReset({
        email: parsed.data.email,
        redirectTo: `${clientEnv.NEXT_PUBLIC_APP_URL}${AUTH_ROUTES.resetPassword}`,
      });

      if (result.error) {
        toast.error(
          result.error.message ??
            "Unable to process your request. Please try again later.",
        );
        return;
      }

      setIsSubmitted(true);
      toast.success("Check your email for reset instructions.");
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <InkcubaLoader fullScreen label="Sending reset link..." />;
  }

  if (isSubmitted) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-slate-900 bg-sky-50 shadow-inkcuba">
          <Mail className="h-8 w-8 text-sky-500" />
        </div>
        <div className="space-y-2">
          <h3 className="font-heading text-xl font-bold text-slate-900">
            Check your inbox
          </h3>
          <p className="text-sm leading-relaxed text-slate-600">
            If an account exists for <strong>{email}</strong>, we&apos;ve sent
            password reset instructions. The link expires in 1 hour.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full border-slate-900">
          <Link href={AUTH_ROUTES.signIn}>
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="forgot-email">BINUS Email</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder="name@binus.edu or name@binus.ac.id"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email ? (
          <p className="text-xs text-red-500">{errors.email}</p>
        ) : (
          <p className="text-xs text-slate-400">
            Enter the BINUS email associated with your account.
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full bg-sky-500 shadow-inkcuba hover:bg-sky-600 hover:shadow-inkcuba-hover"
        size="lg"
      >
        Send Reset Link
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
