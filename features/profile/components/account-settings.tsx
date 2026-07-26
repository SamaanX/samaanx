"use client";

import { Globe2, LogOut, Moon, Sun, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions/sign-out";
import { FormMessage } from "@/features/profile/components/form-message";
import { LoadingButton } from "@/features/profile/components/loading-button";
import { useTheme } from "@/providers/theme-provider";

export function AccountSettings() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  async function handleLogout() {
    setError(null);
    setLoggingOut(true);
    const result = await signOutAction();
    setLoggingOut(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <section
      id="account"
      aria-labelledby="account-settings-heading"
      className="border-border/70 bg-card scroll-mt-28 overflow-hidden rounded-[1.35rem] border shadow-[var(--rp-shadow-xs)] sm:rounded-[1.5rem] lg:sticky lg:top-28"
    >
      <div className="border-border/60 border-b px-4 py-4 sm:px-5">
        <h2
          id="account-settings-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Account
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Appearance and session controls.
        </p>
      </div>

      <div className="divide-border/60 divide-y">
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="bg-brand-blue-soft text-brand-blue mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
              {isDark ? (
                <Sun className="size-4" aria-hidden />
              ) : (
                <Moon className="size-4" aria-hidden />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">Theme</p>
              <p className="text-muted-foreground text-xs">
                {isDark ? "Dark appearance" : "Light appearance"}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 shrink-0 rounded-xl px-3"
            disabled={!mounted}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? "Light" : "Dark"}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="bg-muted text-muted-foreground mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
              <Globe2 className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">Language</p>
              <p className="text-muted-foreground text-xs">Coming soon</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            className="h-10 shrink-0 rounded-xl"
          >
            English
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="bg-destructive/10 text-destructive mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
              <Trash2 className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-muted-foreground text-xs">Coming soon</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            className="h-10 shrink-0 rounded-xl"
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="border-border/60 space-y-3 border-t px-4 py-4 sm:px-5">
        <FormMessage message={error} />
        <LoadingButton
          type="button"
          variant="outline"
          loading={loggingOut}
          className="w-full"
          onClick={() => void handleLogout()}
        >
          <LogOut className="size-4" aria-hidden />
          Log out
        </LoadingButton>
      </div>
    </section>
  );
}
