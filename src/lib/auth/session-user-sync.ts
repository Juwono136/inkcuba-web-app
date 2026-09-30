"use client";

/**
 * Helpers to keep chrome (navbar avatar, menus) in sync after My Settings
 * updates `user.image` outside Better Auth's cookie-cached session payload.
 */

export const SESSION_USER_UPDATED_EVENT = "inkcuba:session-user-updated";

export type SessionUserPatch = {
  image?: string | null;
  name?: string;
};

export function notifySessionUserUpdated(patch: SessionUserPatch) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<SessionUserPatch>(SESSION_USER_UPDATED_EVENT, {
      detail: patch,
    }),
  );
}

export function subscribeSessionUserUpdated(
  listener: (patch: SessionUserPatch) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const custom = event as CustomEvent<SessionUserPatch>;
    if (custom.detail) listener(custom.detail);
  };

  window.addEventListener(SESSION_USER_UPDATED_EVENT, handler);
  return () => window.removeEventListener(SESSION_USER_UPDATED_EVENT, handler);
}
