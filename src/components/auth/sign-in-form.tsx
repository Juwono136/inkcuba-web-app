"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { siteConfig } from "@/config/site";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { signIn } from "@/lib/auth/client";
import { getDashboardPath } from "@/lib/auth/redirect";
import { resolveUserRole } from "@/lib/auth/permissions";
import {
  clearRememberedCredentials,
  loadRememberedCredentials,
  saveRememberedCredentials,
} from "@/lib/auth/remember-credentials";
import { signInSchema } from "@/lib/validators/auth";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function hydrateRememberedCredentials() {
      const saved = await loadRememberedCredentials();

      if (cancelled) return;

      if (saved) {
        setEmail(saved.email);
        setPassword(saved.password);
        setRememberMe(true);
      }

      setIsHydrating(false);
    }

    void hydrateRememberedCredentials();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});

    const parsed = signInSchema.safeParse({ email, password, rememberMe });

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
      const redirectPath = callbackUrl ?? "/dashboard";

      const result = await signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
        callbackURL: redirectPath,
      });

      if (result.error) {
        const message =
          result.error.message ??
          "Sign in failed. Please check your credentials.";

        if (message.toLowerCase().includes("verify")) {
          toast.error("Please verify your email before signing in.");
        } else {
          toast.error(message);
        }
        return;
      }

      if (parsed.data.rememberMe) {
        await saveRememberedCredentials(
          parsed.data.email,
          parsed.data.password,
        );
      } else {
        clearRememberedCredentials();
      }

      toast.success("Welcome back!");

      const destination =
        callbackUrl ??
        (result.data?.user
          ? getDashboardPath(resolveUserRole(result.data.user))
          : "/dashboard");

      router.push(destination);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isHydrating) {
    return <InkcubaLoader label="Loading sign in..." />;
  }

  if (isLoading) {
    return <InkcubaLoader fullScreen label="Signing you in..." />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">BINUS Email</Label>
        <Input
          id="email"
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
            Only @binus.edu and @binus.ac.id emails are accepted.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="password">Password</Label>
          <Link
            href={AUTH_ROUTES.forgotPassword}
            className="text-xs font-medium text-sky-600 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(errors.password)}
        />
        {errors.password ? (
          <p className="text-xs text-red-500">{errors.password}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Checkbox
            id="rememberMe"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
          />
          <Label
            htmlFor="rememberMe"
            className="cursor-pointer text-sm font-normal text-slate-600"
          >
            Remember me
          </Label>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-sky-500 shadow-inkcuba hover:bg-sky-600 hover:shadow-inkcuba-hover"
        size="lg"
      >
        Sign In
      </Button>

      <p className="text-center text-sm text-slate-600">
        Don&apos;t have an account?{" "}
        <Link
          href={siteConfig.links.signUp}
          className="font-semibold text-sky-600 hover:underline"
        >
          Get Started
        </Link>
      </p>
    </form>
  );
}
