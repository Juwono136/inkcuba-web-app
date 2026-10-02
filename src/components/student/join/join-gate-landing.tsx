import Link from "next/link";
import { LockKeyhole, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import type { WorkspaceInvitePreview } from "@/lib/workspaces/student-service";

type JoinGateLandingProps = {
  code: string;
  preview: WorkspaceInvitePreview | null;
  signInHref: string;
};

export function JoinGateLanding({
  code,
  preview,
  signInHref,
}: JoinGateLandingProps) {
  return (
    <div className="mx-auto w-full max-w-lg space-y-6 px-4 py-12">
      <div className="overflow-hidden rounded-3xl border-2 border-inkcuba-navy bg-white shadow-inkcuba">
        <div className="border-b-2 border-inkcuba-navy bg-gradient-to-r from-sky-100 via-violet-100 to-amber-100 px-5 py-6 sm:px-7">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-inkcuba-navy bg-white text-inkcuba-purple shadow-inkcuba">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 sm:text-3xl">
            Sign in to join this workspace
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Students must use a verified BINUS account before entering a class
            workspace. After you sign in, we will bring you straight back here
            and open the workspace.
          </p>
        </div>

        <div className="space-y-5 p-5 sm:p-7">
          {preview ? (
            <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                Workspace invite
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
          ) : code ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                Invite code{" "}
                <span className="font-mono font-semibold tracking-wider text-slate-900">
                  {code}
                </span>{" "}
                will be applied after you sign in. If the code is invalid or the
                workspace is not Active yet, you will see a clear message next.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Open the invite link from your lecturer, or sign in and enter the
              8-character invite code on the next step.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              asChild
              className="flex-1 bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600"
              size="lg"
            >
              <Link href={signInHref}>
                <LogIn className="h-4 w-4" />
                Sign in to continue
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="flex-1 border-slate-900"
              size="lg"
            >
              <Link href={AUTH_ROUTES.signUp}>Create student account</Link>
            </Button>
          </div>

          <p className="text-xs leading-relaxed text-slate-500">
            Already signed in on another tab? Refresh this page. Lecturers and
            admins should use their own dashboard — only student accounts can
            join class workspaces.
          </p>
        </div>
      </div>
    </div>
  );
}
