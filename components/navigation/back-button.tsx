"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { cn } from "@/lib/utils";

export type BackButtonProps = {
  /** Used when there is no in-app history to go back to. */
  fallbackHref: string;
  /** Visible label after the arrow. */
  label?: string;
  className?: string;
};

function hasInAppHistory(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const referrer = document.referrer;
    if (referrer) {
      const origin = window.location.origin;
      if (referrer.startsWith(origin)) {
        return true;
      }
    }
  } catch {
    // Ignore referrer access issues.
  }

  // Direct / new-tab opens usually have length 1.
  return window.history.length > 1;
}

/**
 * Consistent in-app back control.
 * Prefers router.back() when history exists; otherwise navigates to fallbackHref.
 */
export function BackButton({
  fallbackHref,
  label = "Back",
  className,
}: BackButtonProps) {
  const router = useRouter();

  function onClick() {
    if (hasInAppHistory()) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-brand-blue inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium transition-colors",
        "hover:bg-brand-blue-soft hover:text-brand-blue",
        "active:bg-brand-blue-soft/80",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
      aria-label={label === "Back" ? "Go back" : label}
    >
      <ArrowLeft className="size-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </button>
  );
}
