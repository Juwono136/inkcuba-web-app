"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  WorkspaceForm,
  type WorkspaceFormValues,
} from "@/components/lecturer/workspaces/workspace-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { WorkspaceDetail } from "@/lib/workspaces/types";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

type PendingCreate = {
  values: WorkspaceFormValues;
  backgroundFile: File | null;
  clearBackground: boolean;
};

export function WorkspaceCreateClient() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<PendingCreate | null>(null);

  async function createWorkspace(input: PendingCreate) {
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("name", input.values.name);
      form.append("className", input.values.className);
      form.append("semester", input.values.semester);
      form.append("description", input.values.description || "");
      form.append("status", input.values.status);
      if (input.backgroundFile) {
        form.append("background", input.backgroundFile);
      }

      const response = await fetch("/api/lecturer/workspaces", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as ApiEnvelope<{
        workspace: WorkspaceDetail;
      }>;
      if (!payload.success) {
        throw new Error(payload.error?.message || "Failed to create workspace");
      }

      toast.success("Workspace created");
      router.push(
        `/dashboard/lecturer/workspaces/${payload.data.workspace.id}`,
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create workspace",
      );
      throw error;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900 sm:text-3xl">
          Create workspace
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Set up the class container students will submit portfolios into.
        </p>
      </div>
      <div className="rounded-2xl border-2 border-inkcuba-navy bg-white p-5 shadow-inkcuba sm:p-6">
        <WorkspaceForm
          mode="create"
          submitting={submitting}
          imageUploadUrl="/api/lecturer/workspaces/tmp-description-image"
          initial={{
            name: "",
            className: "",
            semester: "",
            description: "",
            status: "DRAFT",
          }}
          onSubmit={async (input) => {
            setPending(input);
            setConfirmOpen(true);
          }}
          onCancel={() => router.push("/dashboard/lecturer/workspaces")}
        />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open && !submitting) setPending(null);
        }}
        title="Create this workspace?"
        description="Your new workspace will be saved with the details you entered. You can edit them later from the Info tab."
        confirmLabel="Create workspace"
        loading={submitting}
        onConfirm={async () => {
          if (!pending) return;
          await createWorkspace(pending);
        }}
      />
    </div>
  );
}
