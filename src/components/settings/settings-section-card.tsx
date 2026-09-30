"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

type SettingsSectionCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function SettingsSectionCard({
  title,
  description,
  children,
  className,
  delay = 0,
}: SettingsSectionCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl border-2 border-inkcuba-navy bg-white p-5 shadow-inkcuba sm:p-6",
        className,
      )}
    >
      <div className="mb-5 min-w-0 space-y-1">
        <h2 className="font-heading text-xl font-bold break-words text-slate-900">
          {title}
        </h2>
        <p className="text-sm break-words text-slate-600">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </motion.section>
  );
}
