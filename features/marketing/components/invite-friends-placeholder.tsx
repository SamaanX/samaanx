"use client";

import { UserPlus } from "lucide-react";

/**
 * Placeholder for referral / invite flow — wired when campaigns launch.
 */
export function InviteFriendsPlaceholder() {
  return (
    <section
      aria-label="Invite friends"
      className="border-border/80 bg-card/50 rounded-2xl border border-dashed px-4 py-5 text-center"
    >
      <UserPlus className="text-brand-blue mx-auto size-5" aria-hidden />
      <p className="mt-2 text-sm font-semibold">Invite friends</p>
      <p className="text-muted-foreground mt-1 text-xs">
        Referral rewards coming soon — earn when friends join SamaanX.
      </p>
    </section>
  );
}
