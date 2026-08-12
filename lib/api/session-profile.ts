import { getCurrentProfile } from "@/lib/auth/guards";
import { getCurrentUser, isAnonymousUser } from "@/lib/auth/session";

export async function getOptionalSessionProfile() {
  const [user, profile] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
  ]);

  if (!user || isAnonymousUser(user) || !profile) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    profile: {
      id: profile.id,
      displayName: profile.displayName,
      role: profile.role,
      avatarUrl: profile.avatarUrl,
    },
  };
}
