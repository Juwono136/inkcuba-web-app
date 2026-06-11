"use client";

import { Check, X } from "lucide-react";

import { getPasswordRequirementChecks } from "@/lib/validators/password";
import { cn } from "@/lib/utils";

type PasswordRequirementsProps = {
  password: string;
  className?: string;
};

const requirements = [
  { key: "minLength" as const, label: "At least 8 characters" },
  { key: "uppercase" as const, label: "One uppercase letter" },
  { key: "lowercase" as const, label: "One lowercase letter" },
  { key: "number" as const, label: "One number" },
];

export function PasswordRequirements({
  password,
  className,
}: PasswordRequirementsProps) {
  const checks = getPasswordRequirementChecks(password);

  if (!password) return null;

  return (
    <ul className={cn("space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3", className)}>
      {requirements.map((item) => {
        const passed = checks[item.key];

        return (
          <li
            key={item.key}
            className={cn(
              "flex items-center gap-2 text-xs",
              passed ? "text-emerald-600" : "text-slate-500",
            )}
          >
            {passed ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{item.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
