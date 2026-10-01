"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, RefreshCw, Save, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import type { UserRole } from "@/lib/auth/permissions";
import {
  ROLE_RELEVANT_IDENTITY_FIELDS,
  SETTINGS_IDENTITY_FIELD_LABELS,
  SETTINGS_IDENTITY_FIELDS,
  type RoleFieldPermissionMatrix,
  type SettingsIdentityField,
} from "@/lib/role-field-permissions/types";
import { cn } from "@/lib/utils";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

const QUERY_KEY = "admin-role-field-permissions";
const ROLES: UserRole[] = ["STUDENT", "LECTURER", "ADMIN"];

const ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: "Student",
  LECTURER: "Lecturer",
  ADMIN: "Administrator",
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!payload.success) {
    throw new Error(payload.error?.message || "Request failed");
  }
  return payload.data;
}

function emptyMatrix(): RoleFieldPermissionMatrix {
  const matrix = {} as RoleFieldPermissionMatrix;
  for (const role of ROLES) {
    matrix[role] = {} as Record<SettingsIdentityField, boolean>;
    for (const field of SETTINGS_IDENTITY_FIELDS) {
      matrix[role][field] = false;
    }
  }
  return matrix;
}

export function FieldPermissionsPageClient() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<RoleFieldPermissionMatrix>(emptyMatrix());
  const [syncedKey, setSyncedKey] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const query = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      try {
        return await readJson<{
          matrix: RoleFieldPermissionMatrix;
          relevantByRole: Record<UserRole, SettingsIdentityField[]>;
        }>(
          await fetch("/api/admin/role-field-permissions", {
            cache: "no-store",
          }),
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load permissions",
        );
        throw error;
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (matrix: RoleFieldPermissionMatrix) => {
      const items: {
        role: UserRole;
        field: SettingsIdentityField;
        editableBySelf: boolean;
      }[] = [];
      for (const role of ROLES) {
        for (const field of SETTINGS_IDENTITY_FIELDS) {
          items.push({
            role,
            field,
            editableBySelf: matrix[role][field],
          });
        }
      }
      return readJson<{ matrix: RoleFieldPermissionMatrix }>(
        await fetch("/api/admin/role-field-permissions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        }),
      );
    },
    onSuccess: (data) => {
      toast.success("Field permissions saved");
      setDraft(data.matrix);
      setSyncedKey(JSON.stringify(data.matrix));
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      setConfirmOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Save failed");
    },
  });

  const serverMatrix = query.data?.matrix;
  const syncKey = serverMatrix ? JSON.stringify(serverMatrix) : "";
  if (syncKey && syncKey !== syncedKey && !saveMutation.isPending) {
    setSyncedKey(syncKey);
    setDraft(serverMatrix!);
  }

  const dirty =
    !!serverMatrix &&
    ROLES.some((role) =>
      SETTINGS_IDENTITY_FIELDS.some(
        (field) => draft[role][field] !== serverMatrix[role][field],
      ),
    );

  function toggle(
    role: UserRole,
    field: SettingsIdentityField,
    checked: boolean,
  ) {
    const relevant =
      query.data?.relevantByRole?.[role] ?? ROLE_RELEVANT_IDENTITY_FIELDS[role];
    if (!relevant.includes(field)) return;
    setDraft((prev) => ({
      ...prev,
      [role]: { ...prev[role], [field]: checked },
    }));
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border-2 border-inkcuba-navy bg-white shadow-inkcuba">
        <div className="flex flex-col gap-3 border-b-2 border-inkcuba-navy bg-gradient-to-r from-sky-100 via-violet-100 to-amber-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-inkcuba-navy bg-white text-inkcuba-cyan">
              <Shield className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-wide text-inkcuba-navy uppercase">
                Permissions
              </p>
              <p className="truncate font-heading text-lg font-bold text-slate-900">
                My Settings field access
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="border-2 border-inkcuba-navy bg-sky-500 shadow-inkcuba hover:bg-sky-600"
              disabled={!dirty || saveMutation.isPending || query.isLoading}
              onClick={() => setConfirmOpen(true)}
            >
              <Save className="h-4 w-4" />
              Save changes
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-2 border-inkcuba-navy"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw
                className={cn("h-4 w-4", query.isFetching && "animate-spin")}
              />
              Refresh
            </Button>
          </div>
        </div>

        <div className="space-y-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 sm:px-5">
          <p>
            Choose which identity fields each role may edit on{" "}
            <strong className="font-semibold text-slate-800">My Settings</strong>
            . Admin User Management can always edit all fields. Unchecked fields
            stay read-only for that role.
          </p>
        </div>

        {query.isLoading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading permissions…
          </div>
        ) : null}

        {!query.isLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Field</th>
                  {ROLES.map((role) => (
                    <th key={role} className="px-4 py-3 text-center sm:px-5">
                      {ROLE_LABELS[role]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {SETTINGS_IDENTITY_FIELDS.map((field) => (
                    <motion.tr
                      key={field}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-b border-slate-100 hover:bg-sky-50/40"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900 sm:px-5">
                        {SETTINGS_IDENTITY_FIELD_LABELS[field]}
                      </td>
                      {ROLES.map((role) => {
                        const relevant = (
                          query.data?.relevantByRole?.[role] ??
                          ROLE_RELEVANT_IDENTITY_FIELDS[role]
                        ).includes(field);
                        return (
                          <td
                            key={role}
                            className="px-4 py-3 text-center sm:px-5"
                          >
                            {relevant ? (
                              <div className="inline-flex items-center justify-center gap-2">
                                <Checkbox
                                  id={`${role}-${field}`}
                                  checked={draft[role][field]}
                                  onCheckedChange={(checked) =>
                                    toggle(role, field, checked === true)
                                  }
                                  disabled={saveMutation.isPending}
                                  aria-label={`${ROLE_LABELS[role]} can edit ${SETTINGS_IDENTITY_FIELD_LABELS[field]}`}
                                />
                                <Label
                                  htmlFor={`${role}-${field}`}
                                  className="sr-only"
                                >
                                  Editable
                                </Label>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">N/A</span>
                            )}
                          </td>
                        );
                      })}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Save field permissions?"
        description="Users will immediately gain or lose the ability to edit the selected My Settings fields for their role."
        confirmLabel="Save"
        loading={saveMutation.isPending}
        onConfirm={async () => {
          await saveMutation.mutateAsync(draft);
        }}
      />
    </div>
  );
}
