"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatAdminDateTime } from "@/lib/admin/users/format";
import type { AdminUserDetail } from "@/lib/admin/users/types";
import { cn } from "@/lib/utils";

type UserDetailDialogProps = {
  userId: string | null;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
};

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!payload.success) {
    throw new Error(payload.error?.message || "Request failed");
  }
  return payload.data;
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold tracking-[0.12em] text-slate-500 uppercase">
        {label}
      </p>
      <p
        className="mt-1 text-sm font-medium break-words text-slate-900 [overflow-wrap:anywhere]"
        title={value?.trim() ? value : undefined}
      >
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}

function UserDetailBody({
  user,
  isSelf,
  onChanged,
  onClose,
  onRefetch,
}: {
  user: AdminUserDetail;
  isSelf: boolean;
  onChanged: () => void;
  onClose: () => void;
  onRefetch: () => Promise<unknown>;
}) {
  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [confirm, setConfirm] = useState<
    null | "save" | "soft-delete" | "restore" | "hard-delete"
  >(null);

  const canMutate = !isSelf && !user.deletedAt;
  const dirty =
    canMutate && (role !== user.role || isActive !== user.isActive);

  async function handleSave() {
    if (!canMutate) {
      toast.error("You cannot change your own role or account status");
      throw new Error("Self-edit blocked");
    }

    try {
      const data = await readJson<{ user: AdminUserDetail }>(
        await fetch(`/api/admin/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, isActive }),
        }),
      );

      setRole(data.user.role);
      setIsActive(data.user.isActive);
      toast.success("User updated");
      onChanged();
      await onRefetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
      throw error;
    }
  }

  async function handleSoftDelete() {
    if (isSelf) {
      toast.error("You cannot delete your own account");
      throw new Error("Self-delete blocked");
    }

    try {
      await readJson(
        await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" }),
      );
      toast.success("User moved to trash");
      onChanged();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
      throw error;
    }
  }

  async function handleRestore() {
    try {
      const data = await readJson<{ user: AdminUserDetail }>(
        await fetch(`/api/admin/users/${user.id}/restore`, { method: "POST" }),
      );
      setRole(data.user.role);
      setIsActive(data.user.isActive);
      toast.success("User restored (still inactive until you activate)");
      onChanged();
      await onRefetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Restore failed");
      throw error;
    }
  }

  async function handleHardDelete() {
    if (isSelf) {
      toast.error("You cannot permanently delete your own account");
      throw new Error("Self-delete blocked");
    }

    try {
      await readJson(
        await fetch(`/api/admin/users/${user.id}?hard=true`, {
          method: "DELETE",
        }),
      );
      toast.success("User permanently removed");
      onChanged();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Remove failed");
      throw error;
    }
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-start gap-4 rounded-2xl border-2 border-slate-200 bg-gradient-to-r from-sky-50 via-violet-50 to-amber-50 p-4">
          <UserAvatar name={user.name} image={user.image} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="font-heading text-lg font-bold break-words text-slate-900">
              {user.name}
              {isSelf ? (
                <span className="ml-2 text-sm font-semibold text-inkcuba-purple">
                  (you)
                </span>
              ) : null}
            </p>
            <p className="text-sm break-words text-slate-600 [overflow-wrap:anywhere]">
              {user.email}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full border border-inkcuba-navy bg-white px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-slate-700 uppercase">
                {user.roleLabel}
              </span>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase",
                  user.deletedAt
                    ? "border-amber-600 bg-amber-50 text-amber-800"
                    : user.isActive
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-slate-400 bg-slate-100 text-slate-600",
                )}
              >
                {user.deletedAt
                  ? "In trash"
                  : user.isActive
                    ? "Active"
                    : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Campus" value={user.campus} />
          <ReadOnlyField label="BINUSIAN ID" value={user.binusianId} />
          <ReadOnlyField label="NIM" value={user.nim} />
          <ReadOnlyField label="NIDN" value={user.nidn} />
          <ReadOnlyField label="Major" value={user.major} />
          <ReadOnlyField label="Batch" value={user.batch} />
          <ReadOnlyField label="Semester" value={user.semester} />
          <ReadOnlyField label="Department" value={user.department} />
          <ReadOnlyField label="Title" value={user.title} />
          <ReadOnlyField
            label="Email verified"
            value={user.emailVerified ? "Yes" : "No"}
          />
          <ReadOnlyField
            label="Created"
            value={formatAdminDateTime(user.createdAt)}
          />
          <ReadOnlyField
            label="Last login"
            value={formatAdminDateTime(user.lastLoginAt)}
          />
        </div>

        {!user.deletedAt ? (
          <div className="space-y-4 rounded-2xl border-2 border-inkcuba-navy bg-white p-4">
            <p className="text-xs font-bold tracking-[0.14em] text-inkcuba-navy uppercase">
              Admin controls
            </p>
            {isSelf ? (
              <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                This is your own account. Role, activation, and delete are
                locked here — ask another administrator if those need to change.
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="admin-user-role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(value) =>
                    setRole(value as "STUDENT" | "LECTURER" | "ADMIN")
                  }
                  disabled={isSelf}
                >
                  <SelectTrigger
                    id="admin-user-role"
                    className="w-full rounded-xl border-2 border-slate-900 bg-white"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">Student</SelectItem>
                    <SelectItem value="LECTURER">Lecturer</SelectItem>
                    <SelectItem value="ADMIN">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-user-status">Account status</Label>
                <Select
                  value={isActive ? "ACTIVE" : "INACTIVE"}
                  onValueChange={(value) => setIsActive(value === "ACTIVE")}
                  disabled={isSelf}
                >
                  <SelectTrigger
                    id="admin-user-status"
                    className="w-full rounded-xl border-2 border-slate-900 bg-white"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              Inactive users cannot sign in and must contact an administrator to
              be reactivated. Deactivating also ends all active sessions.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-amber-500 bg-amber-50 p-4 text-sm text-amber-900">
            This account is in the trash
            {user.daysUntilPurge != null
              ? ` · ${user.daysUntilPurge} day(s) until automatic permanent deletion`
              : ""}
            . Restore to bring it back (still inactive), or remove it
            permanently now.
          </div>
        )}
      </div>

      <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {canMutate ? (
            <Button
              type="button"
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50"
              onClick={() => setConfirm("soft-delete")}
            >
              Move to trash
            </Button>
          ) : null}
          {user.deletedAt && !isSelf ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="border-inkcuba-navy"
                onClick={() => setConfirm("restore")}
              >
                Restore
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50"
                onClick={() => setConfirm("hard-delete")}
              >
                Remove permanently
              </Button>
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-slate-900"
            onClick={onClose}
          >
            Close
          </Button>
          {canMutate ? (
            <Button
              type="button"
              className="bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600"
              disabled={!dirty}
              onClick={() => setConfirm("save")}
            >
              Save changes
            </Button>
          ) : null}
        </div>
      </DialogFooter>

      <ConfirmDialog
        open={confirm === "save"}
        onOpenChange={(next) => !next && setConfirm(null)}
        title="Save user changes?"
        description="Role and/or activation status will be updated immediately. Inactive users lose access until reactivated."
        confirmLabel="Save"
        onConfirm={handleSave}
      />
      <ConfirmDialog
        open={confirm === "soft-delete"}
        onOpenChange={(next) => !next && setConfirm(null)}
        title="Move user to trash?"
        description="The account will be deactivated and kept for 30 days. You can restore it from Trash, or it will be permanently deleted after the retention window."
        confirmLabel="Move to trash"
        variant="destructive"
        onConfirm={handleSoftDelete}
      />
      <ConfirmDialog
        open={confirm === "restore"}
        onOpenChange={(next) => !next && setConfirm(null)}
        title="Restore this user?"
        description="The account returns from trash but stays inactive until you explicitly activate it."
        confirmLabel="Restore"
        onConfirm={handleRestore}
      />
      <ConfirmDialog
        open={confirm === "hard-delete"}
        onOpenChange={(next) => !next && setConfirm(null)}
        title="Permanently remove user?"
        description="This cannot be undone. The account, sessions, and stored profile photo (if any) will be deleted from the database and object storage."
        confirmLabel="Remove permanently"
        variant="destructive"
        onConfirm={handleHardDelete}
      />
    </>
  );
}

export function UserDetailDialog({
  userId,
  currentUserId,
  open,
  onOpenChange,
  onChanged,
}: UserDetailDialogProps) {
  const detailQuery = useQuery({
    queryKey: ["admin-user", userId],
    enabled: open && !!userId,
    queryFn: async () => {
      const data = await readJson<{ user: AdminUserDetail }>(
        await fetch(`/api/admin/users/${userId}`, { cache: "no-store" }),
      );
      return data.user;
    },
    retry: 1,
  });

  const user = detailQuery.data ?? null;
  const loading = detailQuery.isLoading;
  const loadFailed = detailQuery.isError;
  const isSelf = !!userId && userId === currentUserId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(90vh,840px)] overflow-y-auto border-2 border-inkcuba-navy shadow-inkcuba sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-slate-900">
            User details
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            Profile fields are read-only. You can update role, activation
            status, or delete this account.
          </DialogDescription>
        </DialogHeader>

        {loadFailed ? (
          <div className="space-y-4 py-8 text-center">
            <p className="text-sm text-red-600">
              {detailQuery.error instanceof Error
                ? detailQuery.error.message
                : "Unable to load user"}
            </p>
            <Button
              type="button"
              variant="outline"
              className="border-slate-900"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : loading || !user ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-inkcuba-purple" />
            Loading user…
          </div>
        ) : (
          <UserDetailBody
            key={`${user.id}-${user.updatedAt}`}
            user={user}
            isSelf={isSelf}
            onChanged={onChanged}
            onClose={() => onOpenChange(false)}
            onRefetch={detailQuery.refetch}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
