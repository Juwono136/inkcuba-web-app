"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import { cn } from "@/lib/utils";

type InkcubaLoaderProps = {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
  fullScreen?: boolean;
};

const sizeMap = {
  sm: { box: "h-8 w-8", image: 32 },
  md: { box: "h-12 w-12", image: 48 },
  lg: { box: "h-16 w-16", image: 64 },
};

export function InkcubaLoader({
  size = "md",
  label = "Loading...",
  className,
  fullScreen = false,
}: InkcubaLoaderProps) {
  const config = sizeMap[size];

  const content = (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className={cn(
          "relative flex items-center justify-center rounded-xl border-2 border-slate-900 bg-white shadow-inkcuba",
          config.box,
        )}
      >
        <Image
          src="/images/inkcuba-logo.png"
          alt=""
          width={config.image}
          height={config.image}
          className="h-[70%] w-[70%] object-contain"
        />
      </motion.div>
      {label ? (
        <p className="text-sm font-medium text-slate-500">{label}</p>
      ) : null}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
