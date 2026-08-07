"use client";

import { MessageSquareHeart, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { FeedbackForm } from "@/features/feedback/components/feedback-form";
import { cn } from "@/lib/utils";

type FeedbackDialogProps = {
  triggerClassName?: string;
  triggerLabel?: string;
  variant?: "ghost" | "outline" | "secondary" | "default";
  size?: "sm" | "default" | "icon";
  iconOnly?: boolean;
};

export function FeedbackDialog({
  triggerClassName,
  triggerLabel = "Feedback",
  variant = "outline",
  size = "sm",
  iconOnly = false,
}: FeedbackDialogProps) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn(
          iconOnly ? "size-10 rounded-xl px-0" : "rounded-xl",
          triggerClassName,
        )}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={iconOnly ? "Send feedback" : undefined}
      >
        <MessageSquareHeart className="size-4" aria-hidden />
        {iconOnly ? null : triggerLabel}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close feedback dialog"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-dialog-title"
            className="border-border/80 bg-card relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border shadow-[var(--rp-shadow-md)] sm:rounded-2xl"
          >
            <div className="border-border/60 flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2
                  id="feedback-dialog-title"
                  className="text-base font-semibold tracking-tight"
                >
                  Send feedback
                </h2>
                <p className="text-muted-foreground text-xs">
                  Help us improve SamaanX
                </p>
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:bg-muted inline-flex size-9 items-center justify-center rounded-xl"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              <FeedbackForm
                showIntro={false}
                onSuccess={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
