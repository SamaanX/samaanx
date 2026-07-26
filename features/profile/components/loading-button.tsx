"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LoadingButtonProps = React.ComponentProps<typeof Button> & {
  loading?: boolean;
};

export function LoadingButton({
  loading = false,
  disabled,
  className,
  children,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      disabled={disabled || loading}
      className={cn("h-12 rounded-xl text-base font-medium", className)}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          <span>Please wait…</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}
