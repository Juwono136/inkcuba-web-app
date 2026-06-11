import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: { box: "h-9 w-9", image: 36, text: "text-lg" },
  md: { box: "h-11 w-11", image: 44, text: "text-xl" },
  lg: { box: "h-16 w-16 sm:h-20 sm:w-20", image: 80, text: "text-2xl sm:text-3xl" },
} as const;

export function BrandLogo({
  showWordmark = true,
  size = "md",
  className,
}: BrandLogoProps) {
  const config = sizeMap[size];

  return (
    <div className={cn("flex items-center gap-2.5 sm:gap-3", className)}>
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center",
          config.box,
        )}
      >
        <Image
          src="/images/inkcuba-logo.png"
          alt="inkcuba"
          width={config.image}
          height={config.image}
          className="h-full w-full object-contain"
          priority
        />
      </span>
      {showWordmark ? (
        <span
          className={cn(
            "font-heading font-bold tracking-tight text-slate-900",
            config.text,
          )}
        >
          inkcuba
        </span>
      ) : null}
    </div>
  );
}
