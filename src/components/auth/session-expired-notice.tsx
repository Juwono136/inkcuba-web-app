"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function SessionExpiredNotice() {
  const searchParams = useSearchParams();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;

    if (searchParams.get("expired") === "1") {
      shown.current = true;
      toast.error("Your session has expired. Please sign in again.");
    }
  }, [searchParams]);

  return null;
}
