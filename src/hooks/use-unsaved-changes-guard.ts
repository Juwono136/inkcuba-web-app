"use client";

import { useEffect, useRef } from "react";

export type UnsavedLeaveTarget =
  | { type: "href"; href: string }
  | { type: "back" };

const GUARD_STATE_KEY = "__inkcubaUnsavedGuard";

function sameDocumentUrl(url: URL) {
  return (
    url.pathname === window.location.pathname &&
    url.search === window.location.search &&
    url.hash === window.location.hash
  );
}

function isGuardState(state: unknown): boolean {
  return Boolean(
    state &&
      typeof state === "object" &&
      GUARD_STATE_KEY in state &&
      (state as Record<string, unknown>)[GUARD_STATE_KEY] === true,
  );
}

/**
 * Blocks leaving a dirty editor: browser refresh/close, history Back/Forward,
 * and same-origin in-app link clicks. Call `allowNextNavigation()` before a
 * confirmed leave so the next history/link action is not re-blocked.
 *
 * Browser Back uses a history trap (`pushState`). After the user confirms leave
 * with `type: "back"`, call `window.history.go(-2)` so both the trap entry and
 * the editor entry are skipped.
 */
export function useUnsavedChangesGuard({
  enabled,
  onBlock,
}: {
  enabled: boolean;
  onBlock: (target: UnsavedLeaveTarget) => void;
}) {
  const enabledRef = useRef(enabled);
  const onBlockRef = useRef(onBlock);
  const allowNextRef = useRef(false);
  const trapActiveRef = useRef(false);

  enabledRef.current = enabled;
  onBlockRef.current = onBlock;

  function allowNextNavigation() {
    allowNextRef.current = true;
  }

  useEffect(() => {
    if (!enabled) {
      // Drop the trap entry after a successful save so Back stays one step away.
      if (trapActiveRef.current && isGuardState(window.history.state)) {
        allowNextRef.current = true;
        trapActiveRef.current = false;
        window.history.back();
      } else {
        trapActiveRef.current = false;
      }
      return;
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (allowNextRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    function armTrap() {
      if (trapActiveRef.current && isGuardState(window.history.state)) return;
      window.history.pushState({ [GUARD_STATE_KEY]: true }, "", window.location.href);
      trapActiveRef.current = true;
    }

    function onPopState() {
      if (allowNextRef.current) {
        allowNextRef.current = false;
        trapActiveRef.current = isGuardState(window.history.state);
        return;
      }
      if (!enabledRef.current) return;
      // Re-arm so the user stays here until they confirm leave in the modal.
      window.history.pushState({ [GUARD_STATE_KEY]: true }, "", window.location.href);
      trapActiveRef.current = true;
      onBlockRef.current({ type: "back" });
    }

    function onDocumentClick(event: MouseEvent) {
      if (!enabledRef.current || allowNextRef.current) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const hrefAttr = anchor.getAttribute("href");
      if (!hrefAttr || hrefAttr.startsWith("#") || hrefAttr.startsWith("mailto:") || hrefAttr.startsWith("tel:")) {
        return;
      }

      let url: URL;
      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (sameDocumentUrl(url)) return;

      event.preventDefault();
      event.stopPropagation();
      onBlockRef.current({
        type: "href",
        href: `${url.pathname}${url.search}${url.hash}`,
      });
    }

    armTrap();
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("click", onDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [enabled]);

  return { allowNextNavigation };
}
