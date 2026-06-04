import { cn } from "@/lib/utils";

type Variant = "success" | "warn" | "error" | "gold" | "blue" | "primary";

const VARIANTS: Record<Variant, string> = {
  success: "bg-[var(--scr-success-hl)] text-[var(--scr-success)]",
  warn: "bg-[var(--scr-warn-hl)] text-[var(--scr-warn)]",
  error: "bg-[var(--scr-error-hl)] text-[var(--scr-error)]",
  gold: "bg-[var(--scr-gold-hl)] text-[var(--scr-gold)]",
  blue: "bg-[var(--scr-blue-hl)] text-[var(--scr-blue)]",
  primary: "bg-[var(--scr-primary-hl)] text-[var(--scr-primary)]",
};

export function ScreenerBadge({
  children,
  variant = "primary",
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium font-mono tracking-wide",
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
