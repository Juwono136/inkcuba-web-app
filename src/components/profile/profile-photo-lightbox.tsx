"use client";

import { motion, useMotionValue } from "framer-motion";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ProfilePhotoLightboxProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt: string;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const WHEEL_STEP = 0.18;
const BUTTON_STEP = 0.25;

function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(value.toFixed(2))));
}

function ToolbarButton({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={cn(
        "h-8 w-8 shrink-0 border-white/20 bg-transparent p-0 text-white hover:bg-white/10 disabled:opacity-40 sm:h-9 sm:w-9",
        className,
      )}
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

export function ProfilePhotoLightbox({
  open,
  onOpenChange,
  src,
  alt,
}: ProfilePhotoLightboxProps) {
  const [scale, setScale] = useState(MIN_SCALE);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const setContainerNode = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setContainerEl(node);
  }, []);

  const resetView = useCallback(() => {
    setScale(MIN_SCALE);
    x.set(0);
    y.set(0);
  }, [x, y]);

  useEffect(() => {
    if (!open) resetView();
  }, [open, resetView]);

  useEffect(() => {
    if (scale <= MIN_SCALE) {
      x.set(0);
      y.set(0);
    }
  }, [scale, x, y]);

  useEffect(() => {
    if (!open || !containerEl) return;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      event.stopPropagation();
      const direction = event.deltaY < 0 ? 1 : -1;
      setScale((prev) => clampScale(prev + direction * WHEEL_STEP));
    }

    containerEl.addEventListener("wheel", onWheel, { passive: false });
    return () => containerEl.removeEventListener("wheel", onWheel);
  }, [open, containerEl]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setScale((prev) => clampScale(prev + BUTTON_STEP));
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        setScale((prev) => clampScale(prev - BUTTON_STEP));
      } else if (event.key === "0") {
        event.preventDefault();
        resetView();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, resetView]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "gap-0 overflow-hidden border-2 border-slate-900 bg-slate-950 p-0 text-white",
          "max-w-[calc(100%-1rem)] rounded-2xl",
          "sm:max-w-5xl",
        )}
      >
        <DialogTitle className="sr-only">Profile photo — {alt}</DialogTitle>
        <DialogDescription className="sr-only">
          Zoom and pan the profile photo using the toolbar controls.
        </DialogDescription>

        <div className="flex flex-col gap-2 border-b border-white/10 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center justify-between gap-2 sm:flex-1">
            <p className="min-w-0 flex-1 truncate text-xs font-medium text-white/90 sm:text-sm">
              {alt}
            </p>
            <ToolbarButton
              label="Close"
              className="sm:hidden"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-3.5 w-3.5" />
            </ToolbarButton>
          </div>

          <div className="flex items-center justify-center gap-1.5 border-t border-white/10 pt-2 sm:justify-end sm:gap-2 sm:border-0 sm:pt-0">
            <ToolbarButton
              label="Zoom out"
              onClick={() => setScale((s) => clampScale(s - BUTTON_STEP))}
              disabled={scale <= MIN_SCALE}
            >
              <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </ToolbarButton>
            <span className="min-w-[2.75rem] text-center font-mono text-[11px] tabular-nums text-white/90 sm:min-w-[3.25rem] sm:text-xs">
              {Math.round(scale * 100)}%
            </span>
            <ToolbarButton
              label="Zoom in"
              onClick={() => setScale((s) => clampScale(s + BUTTON_STEP))}
              disabled={scale >= MAX_SCALE}
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Reset zoom"
              onClick={resetView}
              disabled={scale <= MIN_SCALE}
            >
              <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </ToolbarButton>
            <div
              className="mx-0.5 hidden h-6 w-px bg-white/15 sm:block"
              aria-hidden
            />
            <ToolbarButton
              label="Close"
              className="hidden sm:inline-flex"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </ToolbarButton>
          </div>
        </div>

        <div
          ref={setContainerNode}
          className="relative flex h-[min(62vh,420px)] touch-none items-center justify-center overflow-hidden bg-slate-900 sm:h-[min(78vh,720px)]"
          onDoubleClick={resetView}
        >
          <motion.img
            key={src}
            src={src}
            alt={alt}
            drag={scale > MIN_SCALE}
            dragConstraints={containerRef}
            dragElastic={0.08}
            dragMomentum={false}
            style={{
              x,
              y,
              scale,
              cursor: scale > MIN_SCALE ? "grab" : "zoom-in",
            }}
            whileDrag={{ cursor: "grabbing" }}
            className="max-h-full max-w-full select-none object-contain will-change-transform"
            draggable={false}
          />
          <p className="pointer-events-none absolute bottom-2.5 left-1/2 max-w-[min(100%-1.5rem,18rem)] -translate-x-1/2 truncate rounded-full bg-black/55 px-3 py-1 text-center text-[10px] text-white/80 backdrop-blur-sm sm:bottom-3 sm:max-w-none sm:px-3.5 sm:py-1.5 sm:text-[11px]">
            Use + / − to zoom
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
