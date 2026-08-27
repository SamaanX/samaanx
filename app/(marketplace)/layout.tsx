import { Suspense } from "react";

import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { PreferredModeHydrator } from "@/components/layout/preferred-mode-hydrator";
import {
  RealtimeUserBridge,
  RealtimeUserHydrator,
} from "@/components/layout/realtime-user-bridge";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CriticalActivitySlot } from "@/features/activity/components/critical-activity-slot";
import { isAdminRole } from "@/features/admin/services/permissions";
import { AiAssistantWidget } from "@/features/ai/components/ai-assistant-widget";
import { HeaderNotifications } from "@/features/notifications/components/header-notifications";
import { toProfileViewModel } from "@/features/profile/types/profile";
import { getCurrentProfile } from "@/lib/auth/guards";
import { withPerf } from "@/lib/perf";
import { logRequestSummary } from "@/lib/perf/request-summary";
import { PreferredModeProvider } from "@/providers/preferred-mode-provider";

/**
 * Marketplace shell: paint guest chrome + {children} immediately.
 * Auth-dependent header / banner / welcome stream in via Suspense.
 */
export default function MarketplaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PreferredModeProvider initialMode="BUYER">
      <RealtimeUserBridge>
        <div className="bg-background relative flex min-h-dvh flex-col">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="bg-brand-blue/10 dark:bg-brand-blue/20 absolute -top-28 left-1/2 h-64 w-[28rem] -translate-x-1/2 rounded-full blur-3xl" />
            <div className="bg-brand-green/10 dark:bg-brand-green/15 absolute right-0 bottom-24 h-48 w-48 translate-x-1/4 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 flex min-h-dvh flex-col">
            <Suspense
              fallback={
                <>
                  <SiteHeader
                    isAuthenticated={false}
                    preferredMode="BUYER"
                    modeProfile={null}
                    avatarUrl={null}
                    displayName={null}
                    notificationSlot={null}
                  />
                  <MobileBottomNav isAuthenticated={false} mode="BUYER" />
                </>
              }
            >
              <MarketplaceAuthHeader />
            </Suspense>

            <Suspense fallback={null}>
              <MarketplaceActivityBanner />
            </Suspense>

            <main
              id="main-content"
              className="flex-1 pb-[calc(var(--mobile-bottom-nav-height)+env(safe-area-inset-bottom))] md:pb-0"
              tabIndex={-1}
            >
              {children}
            </main>

            <Suspense
              fallback={
                <SiteFooter preferredMode="BUYER" isAuthenticated={false} />
              }
            >
              <MarketplaceFooter />
            </Suspense>
            <AiAssistantWidget />
          </div>
        </div>
      </RealtimeUserBridge>
    </PreferredModeProvider>
  );
}

async function MarketplaceAuthHeader() {
  const profile = await withPerf("layout.marketplace.profile", () =>
    getCurrentProfile(),
  );
  const profileView = profile ? toProfileViewModel(profile) : null;
  const modeProfile = profileView
    ? {
        displayName: profileView.displayName,
        phone: profileView.phone,
        bio: profileView.bio,
        city: profileView.city,
        area: profileView.area,
      }
    : null;
  const preferredMode = profileView?.preferredMode ?? "BUYER";

  logRequestSummary("layout.marketplace.header");

  return (
    <>
      <PreferredModeHydrator mode={preferredMode} />
      <RealtimeUserHydrator userId={profile?.id ?? null} />
      <SiteHeader
        isAuthenticated={Boolean(profileView)}
        preferredMode={preferredMode}
        modeProfile={modeProfile}
        avatarUrl={profileView?.avatarUrl ?? null}
        displayName={profileView?.displayName ?? null}
        isAdmin={profile ? isAdminRole(profile.role) : false}
        notificationSlot={
          profile ? <HeaderNotifications userId={profile.id} /> : null
        }
      />
      <MobileBottomNav
        isAuthenticated={Boolean(profileView)}
        mode={preferredMode}
      />
    </>
  );
}

async function MarketplaceActivityBanner() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const preferredMode = profile.preferredMode === "SELLER" ? "SELLER" : "BUYER";
  return (
    <CriticalActivitySlot userId={profile.id} preferredMode={preferredMode} />
  );
}

async function MarketplaceFooter() {
  const profile = await getCurrentProfile();
  const preferredMode =
    profile?.preferredMode === "SELLER" ? "SELLER" : "BUYER";
  return (
    <SiteFooter
      preferredMode={preferredMode}
      isAuthenticated={Boolean(profile)}
    />
  );
}
