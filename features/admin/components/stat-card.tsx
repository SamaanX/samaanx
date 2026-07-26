import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warning" | "success" | "danger";
};

const toneClasses = {
  default: "text-foreground",
  warning: "text-amber-600 dark:text-amber-400",
  success: "text-brand-green",
  danger: "text-red-600 dark:text-red-400",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: StatCardProps) {
  return (
    <div className="border-border/70 bg-card rounded-[var(--rp-radius-xl)] border p-4 shadow-[var(--rp-shadow-xs)]">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tracking-tight",
          toneClasses[tone],
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      ) : null}
    </div>
  );
}
