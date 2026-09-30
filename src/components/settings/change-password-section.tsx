"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/auth/password-input";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { SettingsSectionCard } from "@/components/settings/settings-section-card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import {
  clearRememberedCredentials,
  loadRememberedCredentials,
} from "@/lib/auth/remember-credentials";
import { changePasswordSchema } from "@/lib/validators/settings";

type ChangePasswordSectionProps = {
  email: string;
};

export function ChangePasswordSection({ email }: ChangePasswordSectionProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function clearFieldError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validate(): boolean {
    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return false;
    }

    setErrors({});
    return true;
  }

  function handleRequestChange() {
    if (!validate()) {
      toast.error("Please fix the password form errors");
      return;
    }

    setConfirmOpen(true);
  }

  async function handleConfirmChange() {
    setSubmitting(true);
    let didToastError = false;

    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (result.error) {
        const message =
          result.error.message ??
          "Unable to change password. Check your current password.";
        setErrors({ currentPassword: message });
        toast.error(message);
        didToastError = true;
        throw new Error(message);
      }

      try {
        const notifyResponse = await fetch("/api/settings/password-changed", {
          method: "POST",
        });

        if (!notifyResponse.ok) {
          // Password already changed; notification is best-effort
        }
      } catch {
        // Password already changed; notification is best-effort
      }

      const remembered = await loadRememberedCredentials();
      if (
        remembered &&
        remembered.email.toLowerCase() === email.trim().toLowerCase()
      ) {
        clearRememberedCredentials();
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
      toast.success("Password updated. Other sessions were signed out.");
    } catch (error) {
      if (!didToastError) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to change password",
        );
      }
      throw error;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SettingsSectionCard
      title="Security"
      description="Change your password. Other devices will be signed out after a successful update."
      delay={0.2}
    >
      <div className="mx-auto max-w-lg space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current-password">Current password</Label>
          <PasswordInput
            id="current-password"
            autoComplete="current-password"
            placeholder="Enter your current password"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              clearFieldError("currentPassword");
            }}
            disabled={submitting}
            aria-invalid={Boolean(errors.currentPassword)}
          />
          {errors.currentPassword ? (
            <p className="text-xs text-red-500">{errors.currentPassword}</p>
          ) : (
            <p className="text-xs text-slate-500">
              Required to confirm it is you before updating.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            placeholder="Create a strong new password"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              clearFieldError("newPassword");
            }}
            disabled={submitting}
            aria-invalid={Boolean(errors.newPassword)}
          />
          {errors.newPassword ? (
            <p className="text-xs text-red-500">{errors.newPassword}</p>
          ) : (
            <p className="text-xs text-slate-500">
              At least 8 characters with uppercase, lowercase, and a number.
            </p>
          )}
          <PasswordRequirements password={newPassword} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              clearFieldError("confirmPassword");
            }}
            disabled={submitting}
            aria-invalid={Boolean(errors.confirmPassword)}
          />
          {errors.confirmPassword ? (
            <p className="text-xs text-red-500">{errors.confirmPassword}</p>
          ) : (
            <p className="text-xs text-slate-500">
              Must match the new password exactly.
            </p>
          )}
        </div>

        <Button
          type="button"
          onClick={handleRequestChange}
          disabled={submitting}
          className="w-full bg-sky-500 shadow-inkcuba hover:bg-sky-600 sm:w-auto"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Change password
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Change your password?"
        description="You will stay signed in on this device. All other sessions will be signed out, and a confirmation email will be sent."
        confirmLabel="Update password"
        loading={submitting}
        onConfirm={handleConfirmChange}
      />
    </SettingsSectionCard>
  );
}
