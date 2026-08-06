import { Suspense } from "react";

import { PreferredModeHydrator } from "@/components/layout/preferred-mode-hydrator";
import {
  RealtimeUserBridge,
  RealtimeUserHydrator,
} from "@/components/layout/realtime-user-bridge";
import { SiteHeader } from "@/components/layout/site-header";
import { CriticalActivitySlot } from "@/features/activity/components/critical-activity-slot";
import { isAdminRole } from "@/features/admin/services/permissions";
import { HeaderNotifications } from "@/features/notifications/components/header-notifications";
import { toProfileViewModel } from "@/features/profile/types/profile";
import { getCurrentProfile } from "@/lib/auth/guards";
import { getCurrentUser, isAnonymousUser } from "@/lib/auth/session";
import { withPerf } from "@/lib/perf";
import { PreferredModeProvider } from "@/providers/preferred-mode-provider";

/**
 * App shell: stream auth chrome; never block {children} on profile.
 * Realtime subscribes immediately using session user id (no profile DB wait).
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const initialUserId = user && !isAnonymousUser(user) ? user.id : null;

  return (
    <PreferredModeProvider initialMode="BUYER">
      <RealtimeUserBridge initialUserId={initialUserId}>
        <div className="bg-background relative min-h-dvh">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="bg-brand-blue/10 dark:bg-brand-blue/20 absolute -top-28 left-1/2 h-64 w-[28rem] -translate-x-1/2 rounded-full blur-3xl" />
            <div className="bg-brand-green/10 dark:bg-brand-green/15 absolute right-0 bottom-10 h-48 w-48 translate-x-1/4 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 flex min-h-dvh flex-col">
            <Suspense
              fallback={
                <SiteHeader
                  isAuthenticated={false}
                  preferredMode="BUYER"
                  modeProfile={null}
                  avatarUrl={null}
                  displayName={null}
                  notificationSlot={null}
                />
              }
            >
              <AppAuthHeader />
            </Suspense>

            <Suspense fallback={null}>
              <AppActivityBanner />
            </Suspense>

            <main id="main-content" className="flex-1" tabIndex={-1}>
              {children}
            </main>
          </div>
        </div>
      </RealtimeUserBridge>
    </PreferredModeProvider>
  );
}

async function AppAuthHeader() {
  const profile = await withPerf("layout.app.profile", () =>
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
    </>
  );
}

async function AppActivityBanner() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const preferredMode = profile.preferredMode === "SELLER" ? "SELLER" : "BUYER";
  return (
    <CriticalActivitySlot userId={profile.id} preferredMode={preferredMode} />
  );
}
