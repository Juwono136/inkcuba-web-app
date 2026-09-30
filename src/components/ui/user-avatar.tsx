"use client";

import { useEffect, useState } from "react";

import {
  getUserInitials,
  resolveUserImageUrl,
} from "@/lib/media/resolve-avatar-url";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name: string;
  image?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: { box: "h-8 w-8", text: "text-xs" },
  md: { box: "h-10 w-10", text: "text-sm" },
  lg: { box: "h-12 w-12", text: "text-base" },
} as const;

export function UserAvatar({
  name,
  image,
  size = "md",
  className,
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = resolveUserImageUrl(image);
  const config = sizeMap[size];

  // Reset error state whenever the image URL changes (e.g. after settings upload).
  useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || hasError) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-sky-100 font-semibold text-sky-700",
          config.box,
          config.text,
          className,
        )}
        aria-label={name}
      >
        {getUserInitials(name)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={resolvedSrc}
      src={resolvedSrc}
      alt={name}
      width={size === "lg" ? 48 : size === "md" ? 40 : 32}
      height={size === "lg" ? 48 : size === "md" ? 40 : 32}
      onError={() => setHasError(true)}
      className={cn(
        "shrink-0 rounded-full border-2 border-slate-900 object-cover",
        config.box,
        className,
      )}
    />
  );
}
