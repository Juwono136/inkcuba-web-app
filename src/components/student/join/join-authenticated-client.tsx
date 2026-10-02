"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INVITE_CODE_PATTERN } from "@/lib/workspaces/members/types";
import type { WorkspaceInvitePreview } from "@/lib/workspaces/student-service";

type JoinAuthenticatedClientProps = {
  initialCode: string;
  preview: WorkspaceInvitePreview | null;
};

export function JoinAuthenticatedClient({
  initialCode,
  preview,
}: JoinAuthenticatedClientProps) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(Boolean(initialCode));
  const [autoTried, setAutoTried] = useState(false);

  async function join(nextCode: string, source: "LINK" | "CODE") {
    const trimmed = nextCode.trim().toLowerCase();
    if (!INVITE_CODE_PATTERN.test(trimmed)) {
      toast.error(
        "Invite code must be exactly 8 lowercase letters or digits",
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/student/workspaces/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, source }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        data?: { workspaceId: string; alreadyMember: boolean };
        error?: { message: string };
      };
      if (!payload.success || !payload.data?.workspaceId) {
        throw new Error(payload.error?.message || "Unable to join workspace");
      }
      toast.success(
        payload.data.alreadyMember
          ? "You are already a member of this workspace"
          : "Joined workspace successfully",
      );
      router.replace(
        `/dashboard/student/workspaces/${payload.data.workspaceId}`,
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Join failed");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialCode || autoTried) return;
    setAutoTried(true);
    void join(initialCode, "LINK");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode, autoTried]);

  if (loading && initialCode) {
    return (
      <div className="mx-auto flex min-h-[40vh] w-full max-w-md flex-col items-center justify-center gap-3 px-4 py-10">
        <InkcubaLoader label="Joining workspace…" />
        {preview ? (
          <p className="text-center text-sm text-slate-600">
            Opening <span className="font-semibold">{preview.name}</span>…
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-5 px-4 py-10">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900">
          Join a workspace
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter the invite code from your lecturer to open the class workspace.
        </p>
      </div>
      {preview ? (
        <div className="rounded-2xl border-2 border-inkcuba-navy bg-gradient-to-br from-sky-50 to-violet-50 p-4 shadow-inkcuba">
          <p className="text-[11px] font-bold tracking-wide text-inkcuba-navy uppercase">
            Invited to
          </p>
          <p className="mt-1 font-heading text-lg font-bold text-slate-900">
            {preview.name}
          </p>
          <p className="text-sm text-slate-600">
            {preview.className} · {preview.semesterLabel}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Lecturer: {preview.lecturerName}
          </p>
        </div>
      ) : null}
      <form
        className="space-y-4 rounded-2xl border-2 border-inkcuba-navy bg-white p-5 shadow-inkcuba"
        onSubmit={(event) => {
          event.preventDefault();
          void join(code, "CODE");
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="invite-code">Invite code</Label>
          <Input
            id="invite-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toLowerCase())}
            placeholder="e.g. a7k2m9xq"
            maxLength={8}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="rounded-xl border-2 border-slate-900 font-mono tracking-[0.2em]"
            disabled={loading}
          />
          <p className="text-xs text-slate-500">
            Codes are exactly 8 characters (lowercase letters and digits only).
          </p>
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600"
        >
          {loading ? "Joining…" : "Join workspace"}
        </Button>
      </form>
      <p className="text-center text-sm text-slate-500">
        Already joined?{" "}
        <Link
          href="/dashboard/student/workspaces"
          className="font-semibold text-inkcuba-purple underline-offset-2 hover:underline"
        >
          Open my workspaces
        </Link>
      </p>
    </div>
  );
}
