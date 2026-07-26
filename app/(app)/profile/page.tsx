import { redirect } from "next/navigation";

import { BackButton } from "@/components/navigation/back-button";
import { BACK_FALLBACKS } from "@/components/navigation/back-fallbacks";
import { ProfilePageClient } from "@/features/profile/components/profile-page-client";
import { toProfileViewModel } from "@/features/profile/types/profile";
import { getCurrentProfile } from "@/lib/auth/guards";
import { withPerf } from "@/lib/perf";

export const metadata = {
  title: "Profile",
  description: "Manage your SamaanX profile and account settings.",
};

export default async function ProfilePage() {
  const profile = await withPerf("route.profile", () => getCurrentProfile());

  if (!profile) {
    redirect("/login?next=/profile");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-20 sm:px-6 sm:pt-6 lg:max-w-5xl">
      <header className="mb-5 space-y-1 sm:mb-8">
        <BackButton fallbackHref={BACK_FALLBACKS.profile} />
        <h1 className="sr-only">Profile</h1>
      </header>

      <ProfilePageClient initialProfile={toProfileViewModel(profile)} />
    </div>
  );
}
