import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type StarRatingProps = {
  value: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
  label?: string;
};

export function StarRatingDisplay({
  value,
  max = 5,
  size = "sm",
  className,
  label,
}: StarRatingProps) {
  const clamped = Math.min(max, Math.max(0, value));
  const iconSize = size === "sm" ? "size-3.5" : "size-4";

  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={label ?? `${clamped.toFixed(1)} out of ${max} stars`}
    >
      {Array.from({ length: max }, (_, i) => {
        const filled = i + 1 <= Math.round(clamped);
        return (
          <Star
            key={i}
            className={cn(
              iconSize,
              filled
                ? "fill-brand-blue text-brand-blue"
                : "text-muted-foreground/40 fill-transparent",
            )}
            aria-hidden
          />
        );
      })}
    </span>
  );
}

type StarRatingInputProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
};

export function StarRatingInput({
  value,
  onChange,
  disabled,
  className,
}: StarRatingInputProps) {
  return (
    <div
      className={cn("inline-flex items-center gap-1", className)}
      role="radiogroup"
      aria-label="Rating"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const selected = star <= value;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            disabled={disabled}
            onClick={() => onChange(star)}
            className="hover:bg-muted focus-visible:ring-ring rounded-md p-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
          >
            <Star
              className={cn(
                "size-7",
                selected
                  ? "fill-brand-blue text-brand-blue"
                  : "text-muted-foreground/45",
              )}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
