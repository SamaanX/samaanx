"use client";

import { Separator } from "@/components/ui/separator";

type AuthDividerProps = {
  label?: string;
};

export function AuthDivider({ label = "or" }: AuthDividerProps) {
  return (
    <div className="relative my-6 flex items-center gap-3">
      <Separator className="flex-1" />
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </span>
      <Separator className="flex-1" />
    </div>
  );
}
