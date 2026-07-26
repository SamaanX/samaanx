"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  loading,
  onConfirm,
  onClose,
  children,
}: ConfirmDialogProps) {
  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="border-border/70 bg-card relative z-10 w-full max-w-md rounded-[var(--rp-radius-xl)] border p-5 shadow-xl"
      >
        <h3 id="confirm-dialog-title" className="text-lg font-semibold">
          {title}
        </h3>
        <p className="text-muted-foreground mt-2 text-sm">{description}</p>
        {children ? <div className="mt-4 space-y-3">{children}</div> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="border-border rounded-lg border px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={cn(
              "bg-brand-gradient rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60",
            )}
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
