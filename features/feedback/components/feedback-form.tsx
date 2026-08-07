"use client";

import type { FeedbackCategory } from "@prisma/client";
import {
  Bug,
  Lightbulb,
  MessageSquareHeart,
  Palette,
  Sparkles,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createFeedbackAction } from "@/features/feedback/actions/feedback-actions";
import { FEEDBACK_CATEGORY_OPTIONS } from "@/features/feedback/types/feedback";
import { FormMessage } from "@/features/profile/components/form-message";
import { LoadingButton } from "@/features/profile/components/loading-button";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<FeedbackCategory, React.ReactNode> = {
  BUG: <Bug className="size-4" aria-hidden />,
  FEATURE: <Lightbulb className="size-4" aria-hidden />,
  UX: <Palette className="size-4" aria-hidden />,
  GENERAL: <Sparkles className="size-4" aria-hidden />,
  OTHER: <MessageSquareHeart className="size-4" aria-hidden />,
};

type FeedbackFormProps = {
  onSuccess?: () => void;
  showIntro?: boolean;
  className?: string;
};

export function FeedbackForm({
  onSuccess,
  showIntro = true,
  className,
}: FeedbackFormProps) {
  const [category, setCategory] = React.useState<FeedbackCategory>("GENERAL");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const pageUrl =
      typeof window !== "undefined" ? window.location.pathname : null;

    const result = await createFeedbackAction({
      category,
      subject,
      message,
      pageUrl,
    });

    setPending(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setSubject("");
    setMessage("");
    setCategory("GENERAL");
    toast.success("Thanks for your feedback!", {
      description: "Our team will review it soon.",
    });
    onSuccess?.();
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className={cn("space-y-4", className)}
    >
      {showIntro ? (
        <p className="text-muted-foreground text-sm">
          Share bugs, feature ideas, or UX suggestions. We read every
          submission.
        </p>
      ) : null}

      <div className="space-y-2">
        <Label className="text-sm font-medium">Category</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FEEDBACK_CATEGORY_OPTIONS.map((opt) => {
            const selected = category === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition-colors",
                  selected
                    ? "border-brand-blue bg-brand-blue-soft text-brand-blue"
                    : "border-border/70 hover:border-brand-blue/30 hover:bg-muted/40",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {CATEGORY_ICONS[opt.value]}
                  {opt.label}
                </span>
                <span className="text-muted-foreground mt-0.5 block text-xs">
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-subject">Subject</Label>
        <Input
          id="feedback-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Short summary of your feedback"
          maxLength={120}
          className="rounded-xl"
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-message">Details</Label>
        <Textarea
          id="feedback-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what happened, what you expected, or what you'd love to see..."
          rows={5}
          maxLength={2000}
          className="min-h-[7rem] resize-y rounded-xl"
          disabled={pending}
        />
        <p className="text-muted-foreground text-xs">
          {message.length}/2000 characters · at least 10 characters required
        </p>
      </div>

      <FormMessage message={error} />

      <div className="flex flex-wrap gap-2">
        <LoadingButton type="submit" loading={pending} className="rounded-xl">
          Submit feedback
        </LoadingButton>
        <Button
          type="button"
          variant="ghost"
          className="rounded-xl"
          disabled={pending}
          onClick={() => {
            setSubject("");
            setMessage("");
            setError(null);
          }}
        >
          Clear
        </Button>
      </div>
    </form>
  );
}
