"use client";

import { Sparkles, X } from "lucide-react";
import * as React from "react";

import { AiAssistantPanel } from "@/features/ai/components/ai-assistant-panel";
import { cn } from "@/lib/utils";

export function AiAssistantWidget() {
  const [open, setOpen] = React.useState(false);
  const panelId = React.useId();

  React.useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-50 sm:right-6 sm:bottom-6">
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-label="SamaanX AI rental assistant"
          className={cn(
            "border-border/70 bg-card pointer-events-auto mb-3 flex flex-col overflow-hidden rounded-2xl border shadow-[var(--rp-shadow-md)]",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-200",
            "h-[min(560px,calc(100dvh-6.5rem))] w-[min(380px,calc(100vw-2.5rem))]",
            "max-sm:right-0 max-sm:left-auto max-sm:w-[calc(100vw-2.5rem)]",
          )}
        >
          <AiAssistantPanel onClose={() => setOpen(false)} />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? "Close SamaanX AI" : "Ask SamaanX AI"}
        title={open ? "Close SamaanX AI" : "Ask SamaanX AI"}
        className={cn(
          "bg-brand-gradient pointer-events-auto inline-flex size-12 items-center justify-center rounded-full text-white shadow-[var(--rp-shadow-md)] transition-transform",
          "focus-visible:ring-ring hover:scale-105 focus-visible:ring-2 focus-visible:outline-none",
          "motion-safe:active:scale-95",
        )}
      >
        {open ? (
          <X className="size-5" aria-hidden />
        ) : (
          <Sparkles className="size-5" aria-hidden />
        )}
      </button>
    </div>
  );
}
