"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CollapsibleRichTextProps = {
  html: string;
  className?: string;
  /** Collapsed max height in px before “Show more” appears. */
  collapsedMaxHeight?: number;
};

export function CollapsibleRichText({
  html,
  className,
  collapsedMaxHeight = 220,
}: CollapsibleRichTextProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    function measure() {
      if (!contentRef.current) return;
      setNeedsCollapse(contentRef.current.scrollHeight > collapsedMaxHeight + 24);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [html, collapsedMaxHeight]);

  useEffect(() => {
    setExpanded(false);
  }, [html]);

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "relative overflow-hidden transition-[max-height] duration-300 ease-out",
          !expanded && needsCollapse && "pb-2",
        )}
        style={{
          maxHeight:
            !expanded && needsCollapse ? collapsedMaxHeight : undefined,
        }}
      >
        <div
          ref={contentRef}
          className="inkcuba-rich-text-content prose prose-sm max-w-none text-slate-700"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {!expanded && needsCollapse ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/90 to-transparent"
          />
        ) : null}
      </div>

      {needsCollapse ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 h-8 px-2 text-xs font-semibold text-inkcuba-navy hover:bg-slate-100"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Show more"}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              expanded && "rotate-180",
            )}
          />
        </Button>
      ) : null}
    </div>
  );
}
