import { BadgeCheck, Clock, Shield, Sparkles, Star } from "lucide-react";

import type { TrustBadge } from "@/features/trust/lib/seller-level";
import { cn } from "@/lib/utils";

const BADGE_ICON: Record<TrustBadge["id"], typeof Star> = {
  verified: BadgeCheck,
  new_seller: Sparkles,
  trusted_seller: Shield,
  top_rated: Star,
  elite_seller: Sparkles,
  fast_responder: Clock,
};

type TrustBadgeRowProps = {
  badges: TrustBadge[];
  className?: string;
};

export function TrustBadgeRow({ badges, className }: TrustBadgeRowProps) {
  if (badges.length === 0) return null;

  return (
    <ul
      className={cn("flex flex-wrap gap-2", className)}
      aria-label="Trust badges"
    >
      {badges.map((badge) => {
        const Icon = BADGE_ICON[badge.id];
        return (
          <li key={badge.id}>
            <span
              title={badge.description}
              className={cn(
                "border-border/70 bg-muted/50 text-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                badge.id === "verified" &&
                  "border-brand-green/30 bg-brand-green-soft text-brand-green",
                badge.id === "elite_seller" &&
                  "border-brand-blue/30 bg-brand-blue-soft text-brand-blue",
                badge.id === "top_rated" &&
                  "border-brand-blue/25 bg-brand-blue-soft/80 text-brand-blue",
              )}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden />
              {badge.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
