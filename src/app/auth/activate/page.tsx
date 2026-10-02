"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/auth/password-input";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { Button } from "@/components/ui/button";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import { Label } from "@/components/ui/label";
import { AUTH_ROUTES } from "@/lib/auth/constants";

function ActivateFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) {
      toast.error("Activation token is missing.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!payload.success) {
        throw new Error(payload.error?.message || "Activation failed");
      }
      toast.success("Account activated. Please sign in.");
      router.push(AUTH_ROUTES.signIn);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Activation failed",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
        This activation link is missing a token. Please use the link from your
        invitation email.{" "}
        <Link href={AUTH_ROUTES.signIn} className="font-semibold underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900">
          Activate your account
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Create a password to finish activating your inkcuba account and join
          the invited workspace.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <PasswordInput
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
        <PasswordRequirements password={password} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <PasswordInput
          id="confirm"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
        />
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600"
      >
        {loading ? "Activating…" : "Activate & create password"}
      </Button>
    </form>
  );
}

export default function ActivatePage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <Suspense fallback={<InkcubaLoader />}>
        <ActivateFormInner />
      </Suspense>
    </div>
  );
}
