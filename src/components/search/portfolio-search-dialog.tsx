"use client";

import { Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/config/site";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

const quickSuggestions = [
  "Software Engineering",
  "Machine Learning",
  "UI/UX Design",
  "Mobile App",
  "Computer Science",
];

export function PortfolioSearchDialog() {
  const router = useRouter();
  const searchOpen = useUiStore((state) => state.searchOpen);
  const setSearchOpen = useUiStore((state) => state.setSearchOpen);
  const [query, setQuery] = useState("");

  const submitSearch = useCallback(
    (value?: string) => {
      const trimmed = (value ?? query).trim();
      const url = trimmed
        ? `${siteConfig.links.explore}?q=${encodeURIComponent(trimmed)}`
        : siteConfig.links.explore;

      setSearchOpen(false);
      setQuery("");
      router.push(url);
    },
    [query, router, setSearchOpen],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setSearchOpen]);

  return (
    <Dialog
      open={searchOpen}
      onOpenChange={(open) => {
        setSearchOpen(open);
        if (!open) setQuery("");
      }}
    >
      <DialogContent
        showCloseButton
        className="gap-0 overflow-hidden border-2 border-slate-900 p-0 shadow-inkcuba sm:max-w-xl"
      >
        <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-purple-50 px-5 py-4 sm:px-6">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white">
                <Search className="h-4 w-4" />
              </span>
              Search portfolios
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Find verified student projects by title, student, course, or
              technology stack.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form
          className="space-y-5 px-5 py-5 sm:px-6"
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch();
          }}
        >
          <div className="relative">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try &quot;React Native&quot;, a student name, or course code..."
              className="h-12 rounded-xl border-2 border-slate-200 pl-11 text-base focus-visible:border-sky-400 focus-visible:ring-sky-200"
            />
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Sparkles className="h-3.5 w-3.5" />
              Popular searches
            </p>
            <div className="flex flex-wrap gap-2">
              {quickSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setQuery(suggestion);
                    submitSearch(suggestion);
                  }}
                  className={cn(
                    "rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600",
                    "transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700",
                  )}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-center text-xs text-slate-400 sm:text-left">
              Press{" "}
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px]">
                Enter
              </kbd>{" "}
              to search ·{" "}
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px]">
                Esc
              </kbd>{" "}
              to close
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-300"
                onClick={() => setSearchOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-sky-500 px-6 hover:bg-sky-600"
              >
                Search
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
