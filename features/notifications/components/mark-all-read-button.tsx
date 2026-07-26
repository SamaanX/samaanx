"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Loader2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { markNotificationsReadAction } from "@/features/notifications/actions/mark-notifications-read";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

type MarkAllReadButtonProps = {
  disabled?: boolean;
  className?: string;
  size?: "xs" | "sm" | "default";
  onMarked?: () => void;
};

export function MarkAllReadButton({
  disabled = false,
  className,
  size = "sm",
  onMarked,
}: MarkAllReadButtonProps) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = React.useTransition();

  function handleClick() {
    if (disabled || pending) return;
    startTransition(async () => {
      const result = await markNotificationsReadAction();
      if (result.ok) {
        onMarked?.();
        queryClient.setQueryData(
          queryKeys.notifications.inbox(),
          (prev: unknown) => {
            if (!Array.isArray(prev)) return prev;
            const now = new Date().toISOString();
            return prev.map((row: { readAt?: string | null }) =>
              row.readAt ? row : { ...row, readAt: now },
            );
          },
        );
        void queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.all,
        });
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      disabled={disabled || pending}
      onClick={handleClick}
      className={cn("text-brand-blue gap-1.5", className)}
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <CheckCheck className="size-3.5" aria-hidden />
      )}
      Mark all as read
    </Button>
  );
}
