"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useDeferredValue, useState } from "react";
import { toast } from "sonner";

import { UserDetailDialog } from "@/components/admin/users/user-detail-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  USER_LIST_DEFAULT_PAGE_SIZE,
  type UserSortField,
} from "@/lib/admin/users/constants";
import {
  formatAdminDateTime,
  formatAdminRelativeDays,
} from "@/lib/admin/users/format";
import type {
  AdminUserListItem,
  AdminUserListPage,
} from "@/lib/admin/users/types";
import { cn } from "@/lib/utils";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
  return dir === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5" />
  );
}

async function fetchUsersPage(params: URLSearchParams): Promise<AdminUserListPage> {
  const response = await fetch(`/api/admin/users?${params.toString()}`, {
    cache: "no-store",
  });
  const payload = (await response.json()) as ApiEnvelope<AdminUserListPage>;

  if (!payload.success) {
    throw new Error(payload.error?.message || "Failed to load users");
  }

  return payload.data;
}

export function UsersPageClient({ currentUserId }: { currentUserId: string }) {
  const queryClient = useQueryClient();
  const [trash, setTrash] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput.trim());
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState<UserSortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(USER_LIST_DEFAULT_PAGE_SIZE);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const listParams = {
    page,
    pageSize,
    q: deferredSearch,
    role,
    status: trash ? "ALL" : status,
    sortBy,
    sortDir,
    trash,
  };

  const query = useQuery({
    queryKey: ["admin-users", listParams],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(listParams.page),
        pageSize: String(listParams.pageSize),
        q: listParams.q,
        role: listParams.role,
        status: listParams.status,
        sortBy: listParams.sortBy,
        sortDir: listParams.sortDir,
        trash: listParams.trash ? "true" : "false",
      });
      try {
        return await fetchUsersPage(params);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load users",
        );
        throw error;
      }
    },
  });

  function toggleSort(field: UserSortField) {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(field === "name" || field === "email" ? "asc" : "desc");
    }
    setPage(1);
  }

  function openDetail(user: AdminUserListItem) {
    setSelectedUserId(user.id);
    setDetailOpen(true);
  }

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  const data = query.data ?? null;
  const loading = query.isFetching;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border-2 border-inkcuba-navy bg-white shadow-inkcuba">
        <div className="flex flex-col gap-3 border-b-2 border-inkcuba-navy bg-gradient-to-r from-sky-100 via-violet-100 to-amber-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-inkcuba-navy bg-white text-inkcuba-cyan">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold tracking-wide text-inkcuba-navy uppercase">
                Directory
              </p>
              <p className="font-heading text-lg font-bold text-slate-900">
                {trash ? "Trash" : "All registered users"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn(
                "border-2",
                trash
                  ? "border-inkcuba-navy bg-white"
                  : "border-amber-600 bg-amber-50 text-amber-900",
              )}
              onClick={() => {
                setTrash((prev) => !prev);
                setPage(1);
              }}
            >
              <Trash2 className="h-4 w-4" />
              {trash ? "Back to users" : "Open trash"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-2 border-inkcuba-navy"
              onClick={() => void query.refetch()}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setPage(1);
              }}
              placeholder="Search name, email, campus, NIM/NIDN…"
              className="h-10 rounded-xl border-2 border-slate-300 bg-white pl-9"
              aria-label="Search users"
            />
          </div>
          <Select
            value={role}
            onValueChange={(value) => {
              setRole(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10 w-full rounded-xl border-2 border-slate-300 bg-white">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              <SelectItem value="STUDENT">Student</SelectItem>
              <SelectItem value="LECTURER">Lecturer</SelectItem>
              <SelectItem value="ADMIN">Administrator</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={trash ? "ALL" : status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            disabled={trash}
          >
            <SelectTrigger className="h-10 w-full rounded-xl border-2 border-slate-300 bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-white text-[11px] font-bold tracking-wide text-slate-500 uppercase">
              <tr>
                {(
                  [
                    ["name", "User"],
                    ["role", "Role"],
                    ["isActive", "Status"],
                    ["lastLoginAt", "Last login"],
                    ["createdAt", "Joined"],
                  ] as const
                ).map(([field, label]) => (
                  <th key={field} className="px-4 py-3 whitespace-nowrap sm:px-5">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-900"
                      onClick={() => toggleSort(field)}
                    >
                      {label}
                      <SortIcon active={sortBy === field} dir={sortDir} />
                    </button>
                  </th>
                ))}
                {trash ? (
                  <th className="px-4 py-3 whitespace-nowrap sm:px-5">
                    Retention
                  </th>
                ) : null}
                <th className="px-4 py-3 text-right whitespace-nowrap sm:px-5">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr>
                  <td
                    colSpan={trash ? 7 : 6}
                    className="px-4 py-16 text-center text-slate-500 sm:px-5"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading users…
                    </span>
                  </td>
                </tr>
              ) : null}

              {!query.isLoading && items.length === 0 ? (
                <tr>
                  <td
                    colSpan={trash ? 7 : 6}
                    className="px-4 py-16 text-center text-slate-500 sm:px-5"
                  >
                    {trash
                      ? "Trash is empty."
                      : "No users match your filters."}
                  </td>
                </tr>
              ) : null}

              <AnimatePresence initial={false}>
                {items.map((user) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="border-b border-slate-100 hover:bg-sky-50/50"
                  >
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex min-w-[14rem] items-center gap-3">
                        <UserAvatar
                          name={user.name}
                          image={user.image}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {user.name}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap sm:px-5">
                      <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-bold tracking-wide text-slate-700 uppercase">
                        {user.roleLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap sm:px-5">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase",
                          user.deletedAt
                            ? "border-amber-600 bg-amber-50 text-amber-800"
                            : user.isActive
                              ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                              : "border-slate-400 bg-slate-100 text-slate-600",
                        )}
                      >
                        {user.deletedAt
                          ? "Trash"
                          : user.isActive
                            ? "Active"
                            : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 sm:px-5">
                      {formatAdminDateTime(user.lastLoginAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 sm:px-5">
                      {formatAdminDateTime(user.createdAt)}
                    </td>
                    {trash ? (
                      <td className="px-4 py-3 whitespace-nowrap text-amber-800 sm:px-5">
                        {formatAdminRelativeDays(user.daysUntilPurge)}
                      </td>
                    ) : null}
                    <td className="px-4 py-3 text-right sm:px-5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-inkcuba-navy"
                        onClick={() => openDetail(user)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-slate-500">
            {total === 0
              ? "0 users"
              : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[7.5rem] rounded-xl border-2 border-slate-300 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-900"
              disabled={page <= 1 || loading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <span className="text-xs font-semibold text-slate-600">
              Page {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-900"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <UserDetailDialog
        userId={selectedUserId}
        currentUserId={currentUserId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onChanged={refresh}
      />
    </div>
  );
}
