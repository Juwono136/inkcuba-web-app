"use client";

import { useEffect, useState } from "react";

import {
  subscribeSessionUserUpdated,
  type SessionUserPatch,
} from "@/lib/auth/session-user-sync";

export type LiveSessionUser = {
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
};

/**
 * Merges RSC/props user data with optimistic My Settings patches.
 *
 * Intentionally does **not** call Better Auth `useSession()` — that hook is
 * unsafe during SSR in the admin shell (Invalid hook call / null dispatcher).
 * Photo sync relies on `notifySessionUserUpdated` + `router.refresh()` updating
 * `initial` props instead.
 */
export function useLiveSessionUser(initial: LiveSessionUser): LiveSessionUser {
  const [optimistic, setOptimistic] = useState<SessionUserPatch>({});

  useEffect(() => {
    return subscribeSessionUserUpdated((patch) => {
      setOptimistic((prev) => ({ ...prev, ...patch }));
    });
  }, []);

  // After router.refresh() / parent re-render catches up, drop the patch.
  useEffect(() => {
    if (
      optimistic.image !== undefined &&
      initial.image === optimistic.image
    ) {
      setOptimistic((prev) => {
        const next = { ...prev };
        delete next.image;
        return next;
      });
    }
  }, [initial.image, optimistic.image]);

  useEffect(() => {
    if (optimistic.name !== undefined && initial.name === optimistic.name) {
      setOptimistic((prev) => {
        const next = { ...prev };
        delete next.name;
        return next;
      });
    }
  }, [initial.name, optimistic.name]);

  return {
    name: optimistic.name ?? initial.name,
    email: initial.email,
    image:
      optimistic.image !== undefined ? optimistic.image : initial.image,
    role: initial.role ?? null,
  };
}
