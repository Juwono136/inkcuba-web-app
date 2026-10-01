"use client";

import { useQuery } from "@tanstack/react-query";
import { Camera, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  optionsForCategory,
  useAllDirectoryOptions,
} from "@/hooks/use-directory-options";
import { formatAdminDateTime } from "@/lib/admin/users/format";
import type { AdminUserDetail } from "@/lib/admin/users/types";
import type { DirectoryOptionCategory } from "@/lib/directory/types";
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

const DIRECTORY_CLEAR_VALUE = "__directory_clear__";
const CLEAR_PLACEHOLDER = "— leave empty to clear";

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!payload.success) {
    throw new Error(payload.error?.message || "Request failed");
  }
  return payload.data;
}

function nullableField(value: string | null | undefined): string {
  return value?.trim() ? value.trim() : "";
}

function nullableEqual(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const norm = (v: string | null | undefined) =>
    v == null || v.trim() === "" ? null : v.trim();
  return norm(a) === norm(b);
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

function DirectorySelectField({
  id,
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  disabled?: boolean;
}) {
  const selectValue = value === "" ? DIRECTORY_CLEAR_VALUE : value;

  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={selectValue}
        onValueChange={(next) =>
          onChange(next === DIRECTORY_CLEAR_VALUE ? "" : next)
        }
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className="w-full rounded-xl border-2 border-slate-900 bg-white"
        >
          <SelectValue placeholder={CLEAR_PLACEHOLDER} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DIRECTORY_CLEAR_VALUE}>
            {CLEAR_PLACEHOLDER}
          </SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
  const directoryQuery = useAllDirectoryOptions();
  const directoryItems = directoryQuery.data;

  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [name, setName] = useState(user.name);
  const [campus, setCampus] = useState(nullableField(user.campus));
  const [nim, setNim] = useState(() => {
    const existing = nullableField(user.nim);
    if (existing) return existing;
    // Legacy lecturers may only have an ID on nidn — surface it as BINUSIAN ID.
    if (user.role === "LECTURER") return nullableField(user.nidn);
    return "";
  });
  const [nidn, setNidn] = useState(nullableField(user.nidn));
  const [major, setMajor] = useState(nullableField(user.major));
  const [batch, setBatch] = useState(nullableField(user.batch));
  const [semester, setSemester] = useState(nullableField(user.semester));
  const [department, setDepartment] = useState(nullableField(user.department));
  const [title, setTitle] = useState(nullableField(user.title));

  const [confirm, setConfirm] = useState<
    null | "save" | "soft-delete" | "restore" | "hard-delete" | "remove-avatar"
  >(null);
  const [imageUrl, setImageUrl] = useState(user.image);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEditIdentity = !user.deletedAt;
  const canMutateRoleStatus = !isSelf && !user.deletedAt;

  const identityDirty =
    canEditIdentity &&
    (name.trim() !== user.name.trim() ||
      !nullableEqual(campus, user.campus) ||
      !nullableEqual(nim, user.nim) ||
      !nullableEqual(nidn, user.nidn) ||
      !nullableEqual(major, user.major) ||
      !nullableEqual(batch, user.batch) ||
      !nullableEqual(semester, user.semester) ||
      !nullableEqual(department, user.department) ||
      !nullableEqual(title, user.title) ||
      // Prompt save to clear leftover NIDN when role is not lecturer
      ((role === "STUDENT" || role === "ADMIN") &&
        Boolean(user.nidn?.trim())));

  const roleStatusDirty =
    canMutateRoleStatus && (role !== user.role || isActive !== user.isActive);

  const dirty = identityDirty || roleStatusDirty;

  function buildPatchBody(): Record<string, string | boolean> {
    const body: Record<string, string | boolean> = {};

    if (canMutateRoleStatus) {
      if (role !== user.role) body.role = role;
      if (isActive !== user.isActive) body.isActive = isActive;
    }

    if (canEditIdentity) {
      if (name.trim() !== user.name.trim()) body.name = name.trim();
      if (!nullableEqual(campus, user.campus)) body.campus = campus.trim();

      // Role-scoped ID fields:
      // - BINUSIAN ID → always stored on `nim`
      // - NIDN → lecturers only (`nidn`)
      // - Students/admins never send NIDN updates from this form
      if (!nullableEqual(nim, user.nim)) body.nim = nim.trim();
      if (role === "LECTURER") {
        if (!nullableEqual(nidn, user.nidn)) body.nidn = nidn.trim();
      } else if (role === "STUDENT" || role === "ADMIN") {
        // Drop leftover lecturer NIDN when saving as student/admin
        if (user.nidn) body.nidn = "";
      }

      if (!nullableEqual(major, user.major)) body.major = major.trim();
      if (!nullableEqual(batch, user.batch)) body.batch = batch.trim();
      if (!nullableEqual(semester, user.semester)) body.semester = semester.trim();
      if (!nullableEqual(department, user.department))
        body.department = department.trim();
      if (!nullableEqual(title, user.title)) body.title = title.trim();
    }

    return body;
  }

  function applyUserToForm(next: AdminUserDetail) {
    setRole(next.role);
    setIsActive(next.isActive);
    setName(next.name);
    setCampus(nullableField(next.campus));
    const nextNim = nullableField(next.nim);
    setNim(
      nextNim ||
        (next.role === "LECTURER" ? nullableField(next.nidn) : ""),
    );
    setNidn(nullableField(next.nidn));
    setMajor(nullableField(next.major));
    setBatch(nullableField(next.batch));
    setSemester(nullableField(next.semester));
    setDepartment(nullableField(next.department));
    setTitle(nullableField(next.title));
  }

  async function handleSave() {
    const body = buildPatchBody();
    if (Object.keys(body).length === 0) {
      return;
    }

    try {
      const data = await readJson<{ user: AdminUserDetail }>(
        await fetch(`/api/admin/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );

      applyUserToForm(data.user);
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
      applyUserToForm(data.user);
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

  async function handleAvatarUpload(file: File) {
    setAvatarBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await readJson<{ image: string }>(
        await fetch(`/api/admin/users/${user.id}/avatar`, {
          method: "POST",
          body: formData,
        }),
      );
      setImageUrl(data.image);
      toast.success("Profile photo updated");
      onChanged();
      await onRefetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload photo",
      );
    } finally {
      setAvatarBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleAvatarRemove() {
    setAvatarBusy(true);
    try {
      const data = await readJson<{ image: string }>(
        await fetch(`/api/admin/users/${user.id}/avatar`, {
          method: "DELETE",
        }),
      );
      setImageUrl(data.image);
      toast.success("Profile photo removed");
      onChanged();
      await onRefetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove photo",
      );
      throw error;
    } finally {
      setAvatarBusy(false);
    }
  }

  const directoryDisabled =
    directoryQuery.isLoading || directoryQuery.isError;

  const directoryCurrentValues: Record<DirectoryOptionCategory, string> = {
    campus,
    major,
    batch,
    semester,
    department,
  };

  function directoryOptions(category: DirectoryOptionCategory) {
    const current = directoryCurrentValues[category];
    return optionsForCategory(
      directoryItems,
      category,
      current.trim() ? current : null,
    );
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-start gap-4 rounded-2xl border-2 border-slate-200 bg-gradient-to-r from-sky-50 via-violet-50 to-amber-50 p-4">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <UserAvatar name={user.name} image={imageUrl} size="lg" />
            {!user.deletedAt ? (
              <div className="flex flex-wrap justify-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleAvatarUpload(file);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 border-inkcuba-navy px-2"
                  disabled={avatarBusy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  <span className="sr-only sm:not-sr-only sm:ml-1">Photo</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 border-red-600 px-2 text-red-700 hover:bg-red-50"
                  disabled={avatarBusy}
                  onClick={() => setConfirm("remove-avatar")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Remove photo</span>
                </Button>
              </div>
            ) : null}
          </div>
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

        {user.deletedAt ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyField
              label="Campus"
              value={user.directoryLabels.campus ?? user.campus}
            />
            <ReadOnlyField
              label={
                user.role === "STUDENT"
                  ? "BINUSIAN ID / NIM"
                  : "BINUSIAN ID"
              }
              value={user.binusianId}
            />
            {user.role === "LECTURER" ? (
              <ReadOnlyField label="NIDN (Lecturer ID)" value={user.nidn} />
            ) : null}
            <ReadOnlyField
              label="Major"
              value={user.directoryLabels.major ?? user.major}
            />
            <ReadOnlyField
              label="Batch"
              value={user.directoryLabels.batch ?? user.batch}
            />
            <ReadOnlyField
              label="Semester"
              value={user.directoryLabels.semester ?? user.semester}
            />
            <ReadOnlyField
              label="Department"
              value={user.directoryLabels.department ?? user.department}
            />
            <ReadOnlyField label="Title" value={user.title} />
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border-2 border-inkcuba-navy bg-white p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="text-xs font-bold tracking-[0.14em] text-inkcuba-navy uppercase">
                Identity
              </p>
              <p className="text-xs leading-relaxed text-slate-500">
                Manage selectable values in{" "}
                <Link
                  href="/dashboard/admin/directory"
                  className="font-semibold text-inkcuba-purple underline-offset-2 hover:underline"
                >
                  Directory Options
                </Link>
                .
              </p>
            </div>
            {directoryQuery.isError ? (
              <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Could not load directory options. Campus, major, batch, semester,
                and department selects may be unavailable until you refresh.
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2 sm:col-span-2">
                <Label htmlFor="admin-user-name">Name</Label>
                <Input
                  id="admin-user-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Full name"
                  className="rounded-xl border-2 border-slate-900 bg-white"
                  autoComplete="off"
                />
              </div>
              <DirectorySelectField
                id="admin-user-campus"
                label="Campus"
                value={campus}
                onChange={setCampus}
                options={directoryOptions("campus")}
                disabled={directoryDisabled}
              />

              {/* Role-scoped institutional IDs */}
              <div className="min-w-0 space-y-2">
                <Label htmlFor="admin-user-binusian-id">
                  {role === "STUDENT"
                    ? "BINUSIAN ID / NIM (Student ID)"
                    : "BINUSIAN ID"}
                </Label>
                <Input
                  id="admin-user-binusian-id"
                  value={nim}
                  onChange={(event) => setNim(event.target.value)}
                  placeholder={CLEAR_PLACEHOLDER}
                  className="rounded-xl border-2 border-slate-900 bg-white"
                  autoComplete="off"
                />
                {role === "STUDENT" ? (
                  <p className="text-xs text-slate-500">
                    For students, BINUSIAN ID and NIM are the same identifier.
                  </p>
                ) : role === "LECTURER" ? (
                  <p className="text-xs text-slate-500">
                    Institutional BINUSIAN ID for this lecturer.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Administrator institutional ID.
                  </p>
                )}
              </div>

              {role === "LECTURER" ? (
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="admin-user-nidn">NIDN (Lecturer ID)</Label>
                  <Input
                    id="admin-user-nidn"
                    value={nidn}
                    onChange={(event) => setNidn(event.target.value)}
                    placeholder={CLEAR_PLACEHOLDER}
                    className="rounded-xl border-2 border-slate-900 bg-white"
                    autoComplete="off"
                  />
                </div>
              ) : null}

              <DirectorySelectField
                id="admin-user-major"
                label="Major"
                value={major}
                onChange={setMajor}
                options={directoryOptions("major")}
                disabled={directoryDisabled}
              />
              <DirectorySelectField
                id="admin-user-batch"
                label="Batch"
                value={batch}
                onChange={setBatch}
                options={directoryOptions("batch")}
                disabled={directoryDisabled}
              />
              <DirectorySelectField
                id="admin-user-semester"
                label="Semester"
                value={semester}
                onChange={setSemester}
                options={directoryOptions("semester")}
                disabled={directoryDisabled}
              />
              <DirectorySelectField
                id="admin-user-department"
                label="Department"
                value={department}
                onChange={setDepartment}
                options={directoryOptions("department")}
                disabled={directoryDisabled}
              />
              <div className="min-w-0 space-y-2 sm:col-span-2">
                <Label htmlFor="admin-user-title">Title</Label>
                <Input
                  id="admin-user-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={CLEAR_PLACEHOLDER}
                  className="rounded-xl border-2 border-slate-900 bg-white"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Email" value={user.email} />
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
                You can still edit identity fields above.
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
          {canMutateRoleStatus ? (
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
          {canEditIdentity ? (
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
        description="Updated identity fields and/or role and activation status will be saved immediately. Inactive users lose access until reactivated."
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
      <ConfirmDialog
        open={confirm === "remove-avatar"}
        onOpenChange={(next) => !next && setConfirm(null)}
        title="Remove profile photo?"
        description="The current photo will be deleted from storage and replaced with the default avatar."
        confirmLabel="Remove photo"
        variant="destructive"
        loading={avatarBusy}
        onConfirm={handleAvatarRemove}
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
            Edit identity fields, update role and activation, or move accounts to
            trash. Email and sign-in metadata stay read-only.
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
