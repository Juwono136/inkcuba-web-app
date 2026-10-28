"use client";

import { Loader2, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  SUBMISSION_GROUP_ADD_MAX,
  SUBMISSION_GROUP_TOTAL_MAX,
} from "@/lib/workspaces/submissions/types";

type AddGroupsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxGroupSize: number;
  groupCount: number;
  seatCapacity: number;
  loading?: boolean;
  onConfirm: (count: number) => void | Promise<void>;
};

export function AddGroupsDialog({
  open,
  onOpenChange,
  maxGroupSize,
  groupCount,
  seatCapacity,
  loading = false,
  onConfirm,
}: AddGroupsDialogProps) {
  const [countText, setCountText] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const busy = loading || submitting;
  const room = Math.max(0, SUBMISSION_GROUP_TOTAL_MAX - groupCount);
  const maxThisRequest = Math.min(SUBMISSION_GROUP_ADD_MAX, room);
  const count = Number(countText);
  const valid =
    Number.isInteger(count) && count >= 1 && count <= maxThisRequest && room > 0;
  const addedSeats = valid ? count * maxGroupSize : 0;

  useEffect(() => {
    if (open) setCountText("1");
  }, [open]);

  function setCount(next: number) {
    const clamped = Math.min(Math.max(1, next), Math.max(1, maxThisRequest));
    setCountText(String(clamped));
  }

  async function handleConfirm() {
    if (!valid || busy) return;
    setSubmitting(true);
    try {
      await onConfirm(count);
      onOpenChange(false);
    } catch {
      // The caller shows the error. Keep the dialog open for a retry.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && busy) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={!busy}
        className="border-2 border-slate-900 shadow-inkcuba sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-slate-900">
            Add groups
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-slate-600">
            Choose how many empty groups to create in one step. Each group holds up to{" "}
            {maxGroupSize} students.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-800" htmlFor="group-count">
            Number of groups
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-10 shrink-0 border-slate-900 p-0"
              disabled={busy || room === 0 || !Number.isInteger(count) || count <= 1}
              onClick={() => setCount(count - 1)}
              aria-label="Decrease group count"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              id="group-count"
              inputMode="numeric"
              value={countText}
              disabled={busy || room === 0}
              aria-describedby="group-count-help"
              className="h-10 rounded-xl border-2 border-slate-900 text-center text-base font-semibold"
              onChange={(event) => {
                const digits = event.target.value.replace(/[^\d]/g, "").slice(0, 3);
                setCountText(digits);
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 w-10 shrink-0 border-slate-900 p-0"
              disabled={
                busy || room === 0 || (Number.isInteger(count) && count >= maxThisRequest)
              }
              onClick={() => setCount((Number.isInteger(count) ? count : 0) + 1)}
              aria-label="Increase group count"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p id="group-count-help" className="text-sm leading-relaxed text-slate-600">
            {room === 0
              ? `This submission already has the maximum of ${SUBMISSION_GROUP_TOTAL_MAX} groups.`
              : valid
                ? `This adds ${count} empty ${count === 1 ? "group" : "groups"} and ${addedSeats} seats. The board will have ${groupCount + count} groups and ${seatCapacity + addedSeats} seats in total.`
                : `Enter a whole number from 1 to ${maxThisRequest}.`}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            className="border-slate-900"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-sky-500 shadow-inkcuba hover:bg-sky-600"
            disabled={!valid || busy}
            onClick={handleConfirm}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {valid ? `Add ${count} ${count === 1 ? "group" : "groups"}` : "Add groups"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
