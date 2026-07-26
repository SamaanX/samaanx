import * as React from "react";

import { cn } from "@/lib/utils/index";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input bg-card placeholder:text-muted-foreground hover:border-brand-blue/35 focus-visible:border-brand-blue focus-visible:ring-brand-blue/25 disabled:bg-muted/60 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-card dark:hover:border-brand-blue/45 dark:focus-visible:border-brand-green dark:focus-visible:ring-brand-green/30 dark:disabled:bg-muted/40 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 flex field-sizing-content min-h-24 w-full rounded-xl border px-3.5 py-2.5 text-base shadow-[var(--rp-shadow-xs)] transition-[border-color,box-shadow,background-color] duration-200 outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
