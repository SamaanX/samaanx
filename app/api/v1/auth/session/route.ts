import { apiSuccess } from "@/lib/api/route-utils";
import { getOptionalSessionProfile } from "@/lib/api/session-profile";

export const runtime = "nodejs";

export async function GET() {
  const session = await getOptionalSessionProfile();

  if (!session) {
    return apiSuccess({
      authenticated: false,
      user: null,
      profile: null,
    });
  }

  return apiSuccess({
    authenticated: true,
    user: session.user,
    profile: session.profile,
  });
}
