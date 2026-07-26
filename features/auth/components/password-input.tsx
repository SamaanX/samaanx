"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  invalid?: boolean;
};

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(function PasswordInput({ className, invalid, ...props }, ref) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        aria-invalid={invalid || undefined}
        autoComplete={props.autoComplete ?? "current-password"}
        className={cn(
          "h-12 rounded-xl pr-11 text-base md:text-base",
          className,
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="text-muted-foreground hover:bg-brand-blue-soft hover:text-brand-blue focus-visible:ring-ring absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Eye className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
});
