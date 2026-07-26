"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { signInWithGoogleAction } from "@/features/auth/actions/sign-in-google";
import { cn } from "@/lib/utils";

type SocialLoginButtonProps = {
  className?: string;
  label?: string;
};

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.8.6-2.3 1.8C5.1 19.5 8.3 21.6 12 21.6c2.4 0 4.4-.8 5.9-2.1l-3.1-2.4c-.8.6-1.9.9-2.8.9-2.2 0-4-1.5-4.7-3.5z"
      />
      <path
        fill="#4A90E2"
        d="M3.5 6.3C2.6 8 2 9.9 2 12s.6 4 1.5 5.7l3.1-2.4C6.2 14.3 6 13.2 6 12s.2-2.3.6-3.3L3.5 6.3z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.4c1.3 0 2.5.5 3.4 1.3l2.6-2.6C16.4 2.6 14.4 1.8 12 1.8 8.3 1.8 5.1 3.9 3.5 6.3l3.1 2.4C7.9 6.9 9.8 5.4 12 5.4z"
      />
    </svg>
  );
}

export function SocialLoginButton({
  className,
  label = "Continue with Google",
}: SocialLoginButtonProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleGoogle() {
    setLoading(true);
    setError(null);

    const result = await signInWithGoogleAction(window.location.origin);

    if (!result.ok) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    window.location.href = result.data.url;
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={loading}
        onClick={() => void handleGoogle()}
        className={cn(
          "border-border/80 bg-card hover:border-brand-blue/40 hover:bg-brand-blue-soft/60 h-12 w-full rounded-xl text-base font-medium transition-colors",
          className,
        )}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <GoogleIcon className="size-5" />
        )}
        {label}
      </Button>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
