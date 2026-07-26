"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import * as React from "react";

import { buttonVariants } from "@/components/ui/button";
import { NotificationSettings } from "@/features/notifications/components/notification-settings";
import { AccountSettings } from "@/features/profile/components/account-settings";
import { ProfileEditForm } from "@/features/profile/components/profile-edit-form";
import { ProfileHeader } from "@/features/profile/components/profile-header";
import type { ProfileViewModel } from "@/features/profile/types/profile";
import { cn } from "@/lib/utils";

type ProfilePageClientProps = {
  initialProfile: ProfileViewModel;
};

export function ProfilePageClient({ initialProfile }: ProfilePageClientProps) {
  const [profile, setProfile] = React.useState(initialProfile);

  React.useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
      className="space-y-6 sm:space-y-8"
    >
      <ProfileHeader profile={profile} onProfileChange={setProfile} />

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/profile/${profile.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          View public trust profile
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.9fr)] lg:items-start lg:gap-8">
        <ProfileEditForm profile={profile} onProfileChange={setProfile} />
        <div className="space-y-6">
          <NotificationSettings />
          <AccountSettings />
        </div>
      </div>
    </motion.div>
  );
}
