"use client";

import { Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type TypedConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Exact phrase the user must type to enable confirm. */
  confirmPhrase: string;
  confirmPhraseLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
};

export function TypedConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmPhrase,
  confirmPhraseLabel = "Type the workspace name to confirm",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "destructive",
  onConfirm,
  loading = false,
}: TypedConfirmDialogProps) {
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const busy = loading || isSubmitting;
  const matched = draft.trim() === confirmPhrase.trim();

  useEffect(() => {
    if (!open) setDraft("");
  }, [open]);

  async function handleConfirm() {
    if (!matched || busy) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // Caller surfaces errors; keep dialog open.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!busy}
        className="border-2 border-slate-900 shadow-inkcuba sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-slate-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-slate-600">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="typed-confirm-phrase">{confirmPhraseLabel}</Label>
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-semibold text-slate-800">
            {confirmPhrase}
          </p>
          <Input
            id="typed-confirm-phrase"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type exactly as shown above"
            disabled={busy}
            autoComplete="off"
            spellCheck={false}
            className="border-2 border-slate-900"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleConfirm();
              }
            }}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="border-slate-900"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={busy || !matched}
            className={cn(
              "shadow-inkcuba",
              variant === "destructive"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-sky-500 hover:bg-sky-600",
            )}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {confirmLabel}
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
