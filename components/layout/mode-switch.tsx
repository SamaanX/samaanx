"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useTransition } from "react";

import { savePreferredMode } from "@/features/profile/utils/save-preferred-mode";
import { queryKeys } from "@/lib/query-keys";
import type { AppUiMode } from "@/lib/ui/app-mode";
import { cn } from "@/lib/utils";
import { usePreferredMode } from "@/providers/preferred-mode-provider";

type ModeSwitchProps = {
  preferredMode: AppUiMode;
  /** @deprecated Kept for call-site compat; mode save no longer needs profile fields. */
  profile?: unknown;
  className?: string;
};

/**
 * Compact Buyer / Seller switch.
 * Optimistic chrome + HomeModeShell — never router.refresh().
 */
export function ModeSwitch({ preferredMode, className }: ModeSwitchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { mode, setMode } = usePreferredMode(preferredMode);
  const [pending, startTransition] = useTransition();

  React.useEffect(() => {
    setMode(preferredMode);
  }, [preferredMode, setMode]);

  function select(next: AppUiMode) {
    if (next === mode || pending) return;

    const previous = mode;
    setMode(next);

    startTransition(async () => {
      const result = await savePreferredMode(next);

      if (!result.ok) {
        setMode(previous);
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: queryKeys.activity.all,
        refetchType: "active",
      });

      // Leaving seller area as buyer → go home (client nav only).
      if (next === "BUYER" && pathname.startsWith("/seller")) {
        router.replace("/");
      }
    });
  }

  return (
    <div
      role="group"
      aria-label="Buyer or Seller mode"
      className={cn(
        "border-border/80 bg-muted/60 inline-flex h-9 items-center rounded-full border p-0.5",
        className,
      )}
    >
      {(["BUYER", "SELLER"] as const).map((value) => {
        const selected = mode === value;
        return (
          <button
            key={value}
            type="button"
            disabled={pending}
            aria-pressed={selected}
            onClick={() => select(value)}
            className={cn(
              "focus-visible:ring-ring h-8 min-w-[4.25rem] rounded-full px-3 text-xs font-semibold tracking-wide transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-70",
              selected
                ? value === "BUYER"
                  ? "bg-brand-identity text-white shadow-sm"
                  : "bg-brand-green text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value === "BUYER" ? "Buyer" : "Seller"}
          </button>
        );
      })}
    </div>
  );
}
