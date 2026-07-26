"use client";

import { ModeSwitch } from "@/components/layout/mode-switch";
import type { ProfileViewModel } from "@/features/profile/types/profile";
import type { AppUiMode } from "@/lib/ui/app-mode";
import { cn } from "@/lib/utils";
import { usePreferredMode } from "@/providers/preferred-mode-provider";

type ModeProfile = Pick<
  ProfileViewModel,
  "displayName" | "phone" | "bio" | "city" | "area"
>;

type AppModeBarProps = {
  preferredMode: AppUiMode;
  modeProfile: ModeProfile;
};

/** Compact mode chrome for (app) routes — keeps Buyer/Seller switch reachable. */
export function AppModeBar({ preferredMode, modeProfile }: AppModeBarProps) {
  const { mode } = usePreferredMode(preferredMode);
  const isSeller = mode === "SELLER";

  return (
    <div className="border-border/60 bg-background/90 sticky top-0 z-30 border-b backdrop-blur-md">
      <div className="mx-auto flex h-11 max-w-6xl items-center justify-end px-4 sm:px-6">
        <ModeSwitch preferredMode={preferredMode} profile={modeProfile} />
      </div>
      <p
        className={cn(
          "px-4 py-1 text-center text-[0.7rem] font-medium sm:px-6",
          isSeller
            ? "bg-brand-green-soft/50 text-brand-green"
            : "bg-brand-blue-soft/50 text-brand-blue",
        )}
        role="status"
      >
        {isSeller
          ? "Seller mode — listing & request tools"
          : "Buyer mode — switch to Seller to manage listings"}
      </p>
    </div>
  );
}
