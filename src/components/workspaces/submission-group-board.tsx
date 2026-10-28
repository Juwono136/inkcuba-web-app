"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, GripVertical, Loader2, Plus, Search, Shuffle, Trash2, Users } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/user-avatar";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import { AddGroupsDialog } from "@/components/workspaces/add-groups-dialog";
import { SubmissionPager } from "@/components/workspaces/submission-pager";
import { readApiJson } from "@/lib/api/read-response";
import { cn } from "@/lib/utils";
import {
  SUBMISSION_GROUP_PAGE_SIZE,
  SUBMISSION_GROUP_TOTAL_MAX,
  type SubmissionGroupsPayload,
  type SubmissionMember,
  type SubmissionStatus,
} from "@/lib/workspaces/submissions/types";

type SubmissionGroupBoardProps = {
  workspaceId: string;
  submissionId: string;
  mode: "lecturer" | "student";
  status: SubmissionStatus;
  viewerUserId?: string;
  /** Group the signed-in student already belongs to. */
  prepareGroupId?: string | null;
  onPrepareProject?: () => void;
};

const UNASSIGNED = "unassigned";

const collisionDetection: CollisionDetection = (args) => {
  const byPointer = pointerWithin(args);
  return byPointer.length > 0 ? byPointer : closestCenter(args);
};

type PendingMove = {
  userId: string;
  name: string;
  fromLabel: string;
  toGroupId: string | null;
  toLabel: string;
};

function readPayload<T>(response: Response, fallback: string): Promise<T> {
  return readApiJson<T>(response, fallback);
}

export function SubmissionGroupBoard({
  workspaceId,
  submissionId,
  mode,
  status,
  viewerUserId,
  prepareGroupId = null,
  onPrepareProject,
}: SubmissionGroupBoardProps) {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [unassignedPage, setUnassignedPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [confirmRandom, setConfirmRandom] = useState(false);
  const [confirmAdd, setConfirmAdd] = useState(false);
  const [addKey, setAddKey] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [selectEpoch, setSelectEpoch] = useState(0);
  const [dragging, setDragging] = useState<SubmissionMember | null>(null);

  const committedQuery = useRef("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = q.trim();
      if (committedQuery.current === next) return;
      committedQuery.current = next;
      setDebouncedQ(next);
      setPage(1);
      setUnassignedPage(1);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [q]);

  const base =
    mode === "lecturer"
      ? `/api/lecturer/workspaces/${workspaceId}/submissions/${submissionId}`
      : `/api/student/workspaces/${workspaceId}/submissions/${submissionId}`;

  const query = useQuery({
    queryKey: [
      "submission-groups",
      mode,
      workspaceId,
      submissionId,
      page,
      unassignedPage,
      debouncedQ,
    ],
    queryFn: async () => {
      const search = new URLSearchParams({
        page: String(page),
        pageSize: String(SUBMISSION_GROUP_PAGE_SIZE),
        unassignedPage: String(unassignedPage),
        q: debouncedQ,
      });
      const response = await fetch(`${base}/groups?${search}`);
      return readPayload<SubmissionGroupsPayload>(response, "Failed to load groups");
    },
    placeholderData: keepPreviousData,
  });

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 14 } }),
  );

  const locked = status === "CLOSED" || (mode === "student" && status !== "ACTIVE");
  const data = query.data;

  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: ["submission-groups", mode, workspaceId, submissionId],
    });
    await queryClient.invalidateQueries({ queryKey: ["workspace-submission-current"] });
    await queryClient.invalidateQueries({
      queryKey: ["student-submission", workspaceId, submissionId],
    });
  }

  async function move(userId: string, toGroupId: string | null) {
    setBusy(true);
    try {
      const response =
        mode === "lecturer"
          ? await fetch(`${base}/groups/move`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId, toGroupId }),
            })
          : await fetch(`${base}/move`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ toGroupId }),
            });
      await readPayload(response, "Unable to move student");
      toast.success(toGroupId ? "Group updated" : "Student moved to unassigned");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to move student");
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function addGroups(count: number) {
    if (!addKey) return;
    setBusy(true);
    try {
      const response = await fetch(`${base}/groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": addKey,
        },
        body: JSON.stringify({ count }),
      });
      const created = await readPayload<{ count: number }>(
        response,
        "Unable to add groups",
      );
      toast.success(
        created.count === 1 ? "Group added" : `${created.count} groups added`,
      );
      const nextTotal = (query.data?.groups.total ?? 0) + created.count;
      setPage(Math.max(1, Math.ceil(nextTotal / SUBMISSION_GROUP_PAGE_SIZE)));
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add groups");
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function removeGroup(groupId: string) {
    setBusy(true);
    try {
      const response = await fetch(`${base}/groups/${groupId}`, { method: "DELETE" });
      await readPayload(response, "Unable to delete group");
      toast.success("Empty group removed");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete group");
      throw error;
    } finally {
      setBusy(false);
    }
  }

  function requestMove(input: {
    userId: string;
    name: string;
    fromGroupId: string;
    toGroupId: string | null;
  }) {
    const board = query.data;
    if (!board || locked) return;
    const destination = input.toGroupId ?? UNASSIGNED;
    if (input.fromGroupId === destination) return;
    if (input.toGroupId) {
      const target = board.groupOptions.find((option) => option.id === input.toGroupId);
      if (target && target.memberCount >= target.maxMembers) {
        toast.error("That group is already full");
        return;
      }
    }
    const fromLabel =
      input.fromGroupId === UNASSIGNED
        ? "Unassigned"
        : (board.groupOptions.find((option) => option.id === input.fromGroupId)?.name ??
          "Current group");
    const toLabel = input.toGroupId
      ? (board.groupOptions.find((option) => option.id === input.toGroupId)?.name ??
        "Selected group")
      : "Unassigned";
    setPendingMove({
      userId: input.userId,
      name: input.name,
      fromLabel,
      toGroupId: input.toGroupId,
      toLabel,
    });
  }

  async function randomize() {
    setBusy(true);
    try {
      const response = await fetch(`${base}/groups/random`, { method: "POST" });
      const result = await readPayload<{ groupCount: number; studentCount: number }>(
        response,
        "Unable to assign groups",
      );
      toast.success(
        `Assigned ${result.studentCount} students across ${result.groupCount} groups`,
      );
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to assign groups");
      throw error;
    } finally {
      setBusy(false);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setDragging(null);
    if (locked || !query.data) return;
    const userId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : "";
    if (!overId || overId === userId) return;
    if (mode === "student" && userId !== viewerUserId) return;
    if (overId === UNASSIGNED && mode !== "lecturer") return;
    const fromGroupId = String(
      (event.active.data.current as { fromGroupId?: string } | undefined)?.fromGroupId ??
        UNASSIGNED,
    );
    const member =
      query.data.groups.items
        .flatMap((group) => group.members)
        .find((item) => item.userId === userId) ??
      query.data.unassigned.items[0]?.members.find((item) => item.userId === userId) ??
      null;
    if (!member) return;
    const toGroupId = overId === UNASSIGNED ? null : overId;
    const knownGroup =
      toGroupId == null ||
      query.data.groupOptions.some((option) => option.id === toGroupId) ||
      query.data.groups.items.some((group) => group.id === toGroupId);
    if (!knownGroup) return;
    requestMove({
      userId,
      name: member.name,
      fromGroupId,
      toGroupId,
    });
  }

  if (query.isLoading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center">
        <InkcubaLoader label="Loading groups…" />
      </div>
    );
  }

  if (query.isError || !data) {
    return (
      <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {query.error instanceof Error ? query.error.message : "Unable to load groups"}
      </div>
    );
  }

  const shortfall = Math.max(0, data.activeStudentCount - data.seatCapacity);
  const unassigned = data.unassigned.items[0];

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
      <div>
        <h3 className="font-heading text-lg font-bold text-slate-900">Groups</h3>
        <p className="mt-1 text-sm text-slate-600">
          Move students between groups. Each change asks for confirmation first.
        </p>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          {q.trim() !== debouncedQ || (query.isFetching && !query.isLoading) ? (
            <Loader2 className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
          ) : (
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          )}
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search students by name or NIM"
            aria-label="Search group members"
            aria-busy={q.trim() !== debouncedQ || query.isFetching}
            className="h-10 rounded-xl border-2 border-slate-900 pl-9"
          />
        </div>
        {mode === "lecturer" ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:shrink-0">
            <Button
              type="button"
              variant="outline"
              className="border-slate-900"
              disabled={locked || busy}
              onClick={() => setConfirmRandom(true)}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
              Assign randomly
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-slate-900"
              disabled={locked || busy || data.groups.total >= SUBMISSION_GROUP_TOTAL_MAX}
              title={
                data.groups.total >= SUBMISSION_GROUP_TOTAL_MAX
                  ? `A submission can have at most ${SUBMISSION_GROUP_TOTAL_MAX} groups`
                  : undefined
              }
              onClick={() => {
                setAddKey(crypto.randomUUID());
                setConfirmAdd(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add groups
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Stat label="Active students" value={String(data.activeStudentCount)} />
        <Stat label="Groups" value={String(data.groups.total)} />
        <Stat
          label="Seats each"
          value={data.maxGroupSize ? String(data.maxGroupSize) : "—"}
        />
        <Stat label="Total seats" value={String(data.seatCapacity)} />
        {shortfall > 0 ? (
          <Stat
            label="Needs more seats"
            value={String(shortfall)}
            tone="warn"
          />
        ) : null}
      </div>
      {data.maxGroupSize ? (
        <p className="text-xs leading-relaxed text-slate-500">
          Each group holds up to {data.maxGroupSize} students. {data.groups.total}{" "}
          {data.groups.total === 1 ? "group provides" : "groups provide"}{" "}
          {data.seatCapacity} seats in total.
        </p>
      ) : null}
      <p className="text-xs leading-relaxed text-slate-500">
        Press and hold the handle, then drop on a group. You can also use Move to. Nothing changes until you confirm.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        autoScroll
        onDragStart={(event) => {
          const userId = String(event.active.id);
          const member =
            data.groups.items
              .flatMap((group) => group.members)
              .find((item) => item.userId === userId) ??
            unassigned?.members.find((item) => item.userId === userId) ??
            null;
          setDragging(member);
        }}
        onDragCancel={() => setDragging(null)}
        onDragEnd={onDragEnd}
      >
        <div className="space-y-5">
          <section className="space-y-2">
            <div>
              <h4 className="font-heading text-sm font-bold text-slate-900">Unassigned</h4>
              <p className="text-xs text-slate-500">
                Students who are not in a group yet. Drag them into a group below.
              </p>
            </div>
            <GroupColumn
              id={UNASSIGNED}
              title="Waiting list"
              tone="pool"
              count={data.unassigned.total}
              max={null}
              locked={locked || mode === "student"}
              canDelete={false}
            >
              {(unassigned?.members ?? []).length === 0 ? (
                <p className="text-sm text-amber-900/80">No students are waiting.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {(unassigned?.members ?? []).map((member) => (
                    <MemberCard
                      key={member.userId}
                      member={member}
                      draggable={!locked && (mode === "lecturer" || member.userId === viewerUserId)}
                      mine={member.userId === viewerUserId}
                      fromGroupId={UNASSIGNED}
                      selectEpoch={selectEpoch}
                      options={data.groupOptions}
                      allowUnassigned={false}
                      onMove={(toGroupId) =>
                        requestMove({
                          userId: member.userId,
                          name: member.name,
                          fromGroupId: UNASSIGNED,
                          toGroupId,
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </GroupColumn>
            {data.unassigned.totalPages > 1 ? (
              <SubmissionPager
                page={data.unassigned.page}
                pageSize={data.unassigned.pageSize}
                total={data.unassigned.total}
                totalPages={data.unassigned.totalPages}
                onPageChange={setUnassignedPage}
              />
            ) : null}
          </section>
          <section className="space-y-2">
            <div>
              <h4 className="font-heading text-sm font-bold text-slate-900">Groups</h4>
              <p className="text-xs text-slate-500">
                Project groups. Drop a student here, then confirm the move.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.groups.items.map((group) => (
            <GroupColumn
              key={group.id}
              id={group.id}
              title={group.name}
              tone="group"
              count={group.memberCount}
              max={group.maxMembers}
              locked={locked}
              canDelete={mode === "lecturer" && group.memberCount === 0}
              onDelete={() => setPendingDelete({ id: group.id, name: group.name })}
              yours={mode === "student" && group.id === prepareGroupId}
              footer={
                mode === "student" && status === "ACTIVE" && group.memberCount >= 2 ? (
                  <Button
                    type="button"
                    className="h-10 w-full bg-inkcuba-cyan font-semibold hover:bg-sky-600"
                    onClick={() => {
                      if (group.id === prepareGroupId) {
                        onPrepareProject?.();
                        return;
                      }
                      toast.message("Join this group before preparing the project.");
                    }}
                  >
                    Prepare project
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : null
              }
            >
              {group.members.length === 0 && group.memberCount > 0 ? (
                <p className="text-xs text-slate-500">No names match this search.</p>
              ) : null}
              {group.members.map((member) => (
                <MemberCard
                  key={member.userId}
                  member={member}
                  draggable={!locked && (mode === "lecturer" || member.userId === viewerUserId)}
                  mine={member.userId === viewerUserId}
                  fromGroupId={group.id}
                  selectEpoch={selectEpoch}
                  options={data.groupOptions.filter((option) => option.id !== group.id)}
                  allowUnassigned={mode === "lecturer"}
                  onMove={(toGroupId) =>
                    requestMove({
                      userId: member.userId,
                      name: member.name,
                      fromGroupId: group.id,
                      toGroupId,
                    })
                  }
                />
              ))}
            </GroupColumn>
          ))}
            </div>
            {data.groups.totalPages > 1 ? (
              <SubmissionPager
                page={data.groups.page}
                pageSize={data.groups.pageSize}
                total={data.groups.total}
                totalPages={data.groups.totalPages}
                onPageChange={setPage}
              />
            ) : null}
          </section>
        </div>
        <DragOverlay>
          {dragging ? (
            <div className="flex cursor-grabbing items-center gap-2 rounded-xl border-2 border-sky-500 bg-white px-3 py-2 text-sm font-semibold shadow-lg">
              <UserAvatar name={dragging.name} image={dragging.image} size="sm" />
              {dragging.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <ConfirmDialog
        open={confirmRandom}
        onOpenChange={setConfirmRandom}
        title="Assign groups randomly?"
        description="Everyone is reshuffled into evenly sized groups. The current arrangement is replaced."
        confirmLabel="Assign randomly"
        loading={busy}
        onConfirm={randomize}
      />
      {data.maxGroupSize ? (
        <AddGroupsDialog
          open={confirmAdd}
          onOpenChange={setConfirmAdd}
          maxGroupSize={data.maxGroupSize}
          groupCount={data.groups.total}
          seatCapacity={data.seatCapacity}
          loading={busy}
          onConfirm={addGroups}
        />
      ) : null}
      <ConfirmDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={pendingDelete ? `Delete ${pendingDelete.name}?` : "Delete group?"}
        description="Only an empty group can be removed. Students are not deleted from the class."
        confirmLabel="Delete group"
        variant="destructive"
        loading={busy}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await removeGroup(pendingDelete.id);
        }}
      />
      <ConfirmDialog
        open={pendingMove != null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingMove(null);
            setSelectEpoch((value) => value + 1);
          }
        }}
        title="Move this student?"
        description={
          pendingMove
            ? `${pendingMove.name} will move from ${pendingMove.fromLabel} to ${pendingMove.toLabel}.`
            : "Confirm the group change."
        }
        confirmLabel="Move student"
        loading={busy}
        onConfirm={async () => {
          if (!pendingMove) return;
          await move(pendingMove.userId, pendingMove.toGroupId);
          setSelectEpoch((value) => value + 1);
        }}
      />
    </div>
  );
}

function GroupColumn({
  id,
  title,
  tone,
  count,
  max,
  locked,
  canDelete,
  onDelete,
  yours = false,
  footer,
  children,
}: {
  id: string;
  title: string;
  tone: "pool" | "group";
  count: number;
  max: number | null;
  locked: boolean;
  canDelete: boolean;
  onDelete?: () => void;
  yours?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const droppable = useDroppable({ id, disabled: locked });
  const full = max != null && count >= max;

  return (
    <section
      ref={droppable.setNodeRef}
      className={cn(
        "flex min-h-48 flex-col rounded-2xl border p-3 transition sm:min-h-40",
        tone === "pool"
          ? "border-dashed border-amber-400 bg-amber-50/70"
          : "border-slate-200 bg-white shadow-sm",
        droppable.isOver && tone === "pool" && "border-amber-500 bg-amber-100",
        droppable.isOver && tone === "group" && "border-sky-500 bg-sky-50 shadow-md",
        full && tone === "group" && "bg-slate-50",
        yours && "border-sky-500 ring-2 ring-sky-200",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-heading text-sm font-bold text-slate-900">{title}</h3>
            {yours ? (
              <span className="inline-flex shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] leading-4 font-bold tracking-wide text-sky-800 uppercase">
                Your group
              </span>
            ) : null}
            {full ? (
              <span className="inline-flex shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] leading-4 font-bold tracking-wide text-slate-700 uppercase">
                Full
              </span>
            ) : null}
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
            <Users className="h-3 w-3 shrink-0" />
            {max == null
              ? `${count} student${count === 1 ? "" : "s"}`
              : `${count} of ${max}`}
          </p>
        </div>
        {canDelete && onDelete ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1",
          tone === "pool" ? "max-h-[32rem]" : "max-h-80",
        )}
      >
        {droppable.isOver ? (
          <p className="rounded-lg border border-dashed border-sky-400 bg-sky-100 px-2 py-2 text-center text-xs font-semibold text-sky-800">
            Release to review this move
          </p>
        ) : null}
        {children}
      </div>
      {footer ? <div className="mt-3 shrink-0">{footer}</div> : null}
    </section>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2",
        tone === "warn" ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white",
      )}
    >
      <p className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function MemberCard({
  member,
  draggable,
  mine,
  fromGroupId,
  selectEpoch,
  options,
  allowUnassigned,
  onMove,
}: {
  member: SubmissionMember;
  draggable: boolean;
  mine: boolean;
  fromGroupId: string;
  selectEpoch: number;
  options: SubmissionGroupsPayload["groupOptions"];
  allowUnassigned: boolean;
  onMove: (toGroupId: string | null) => void;
}) {
  const drag = useDraggable({
    id: member.userId,
    disabled: !draggable,
    data: { fromGroupId },
  });

  return (
    <div
      ref={drag.setNodeRef}
      className={cn(
        "rounded-xl border bg-white p-2 shadow-sm transition",
        mine ? "border-violet-400 ring-1 ring-violet-200" : "border-slate-200",
        draggable && "hover:border-sky-300",
        drag.isDragging && "opacity-40",
      )}
    >
      <div className="flex items-center gap-2">
        {draggable ? (
          <div
            className="flex h-11 w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 select-none active:cursor-grabbing active:border-sky-400 active:bg-sky-50 active:text-sky-700"
            {...drag.listeners}
            {...drag.attributes}
            aria-label={`Hold and drag ${member.name}`}
          >
            <GripVertical className="h-5 w-5" />
          </div>
        ) : null}
        <UserAvatar name={member.name} image={member.image} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{member.name}</p>
          <p className="truncate text-[11px] text-slate-500">
            {member.nim || member.email}
          </p>
        </div>
      </div>
      {draggable ? (
        <Select
          key={selectEpoch}
          onValueChange={(value) => onMove(value === UNASSIGNED ? null : value)}
        >
          <SelectTrigger className="mt-2 h-10 w-full rounded-lg border-slate-300 text-xs">
            <SelectValue placeholder="Move to…" />
          </SelectTrigger>
          <SelectContent>
            {allowUnassigned ? (
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            ) : null}
            {options.map((option) => (
              <SelectItem
                key={option.id}
                value={option.id}
                disabled={option.memberCount >= option.maxMembers}
              >
                {option.name}
                {option.memberCount >= option.maxMembers ? " (full)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}
