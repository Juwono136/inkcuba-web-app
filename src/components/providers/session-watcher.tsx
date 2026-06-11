"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AUTH_ROUTES } from "@/lib/auth/constants";
import { isDashboardRoute } from "@/lib/auth/redirect";

type SessionResponse = {
  user?: {
    id: string;
  } | null;
};

async function fetchSession(): Promise<SessionResponse | null> {
  try {
    const response = await fetch("/api/auth/get-session", {
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) return null;

    return (await response.json()) as SessionResponse;
  } catch {
    return null;
  }
}

export function SessionWatcher() {
  const pathname = usePathname();
  const router = useRouter();
  const wasAuthenticated = useRef(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function checkSession() {
      const session = await fetchSession();

      if (cancelled) return;

      if (session?.user) {
        wasAuthenticated.current = true;
        return;
      }

      if (wasAuthenticated.current && isDashboardRoute(pathname)) {
        wasAuthenticated.current = false;
        toast.error("Your session has expired. Please sign in again.");
        router.replace(`${AUTH_ROUTES.signIn}?expired=1`);
      }
    }

    void checkSession();

    const interval = window.setInterval(() => {
      void checkSession();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [enabled, pathname, router]);

  return null;
}
