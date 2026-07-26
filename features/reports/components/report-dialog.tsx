"use client";

import type { ReportType } from "@prisma/client";
import { Flag, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createReportAction } from "@/features/reports/actions/report-actions";
import {
  REPORT_TYPE_OPTIONS,
  type ReportDialogTarget,
} from "@/features/reports/types/report";
import { cn } from "@/lib/utils";

type ReportDialogProps = {
  target: ReportDialogTarget;
  triggerClassName?: string;
  triggerLabel?: string;
  variant?: "ghost" | "outline" | "secondary";
  size?: "sm" | "default";
};

export function ReportDialog({
  target,
  triggerClassName,
  triggerLabel = "Report",
  variant = "ghost",
  size = "sm",
}: ReportDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<ReportType>("OTHER");
  const [reason, setReason] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createReportAction({
      targetType: target.targetType,
      targetId: target.targetId,
      rentalId: target.rentalId ?? null,
      type,
      reason,
      details,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setOpen(false);
    setReason("");
    setDetails("");
    setType("OTHER");
    toast.success("Report submitted", {
      description: "Our team will review this shortly.",
    });
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={triggerClassName}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <Flag className="size-4" aria-hidden />
        {triggerLabel}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close report dialog"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-dialog-title"
            className="border-border/80 bg-card relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border shadow-[var(--rp-shadow-md)] sm:rounded-2xl"
          >
            <div className="border-border/60 flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2
                  id="report-dialog-title"
                  className="text-base font-semibold tracking-tight"
                >
                  Report {target.label}
                </h2>
                <p className="text-muted-foreground text-xs">
                  Reports are confidential and reviewed by SamaanX.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="size-4" />
              </Button>
            </div>

            <form
              onSubmit={(e) => void onSubmit(e)}
              className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
            >
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Reason category</legend>
                <div className="grid gap-2">
                  {REPORT_TYPE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={cn(
                        "cursor-pointer rounded-xl border px-3 py-2.5 transition-colors",
                        type === opt.value
                          ? "border-brand-blue/40 bg-brand-blue-soft"
                          : "border-border/70 hover:bg-muted/40",
                      )}
                    >
                      <span className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="report-type"
                          className="mt-1"
                          checked={type === opt.value}
                          onChange={() => setType(opt.value)}
                        />
                        <span>
                          <span className="block text-sm font-medium">
                            {opt.label}
                          </span>
                          <span className="text-muted-foreground block text-xs">
                            {opt.description}
                          </span>
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-1.5">
                <Label htmlFor="report-reason">Short reason</Label>
                <Textarea
                  id="report-reason"
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="What happened?"
                  maxLength={200}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="report-details">Details (optional)</Label>
                <Textarea
                  id="report-details"
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Any extra context that helps our review."
                  maxLength={2000}
                />
              </div>

              {error ? (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pb-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Submitting…" : "Submit report"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
