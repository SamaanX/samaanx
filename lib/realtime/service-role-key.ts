import { getServerEnv } from "@/config/env";
import { logger } from "@/lib/logger";

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

/**
 * Returns the Supabase service role key for Realtime HTTP broadcast.
 * Throws in production when missing — never silently skip peer sync.
 */
export function getSupabaseServiceRoleKey(): string | null {
  const key = getServerEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (key) {
    return key;
  }

  const message =
    "SUPABASE_SERVICE_ROLE_KEY is required in production for Supabase Realtime broadcast.";

  if (isProductionRuntime()) {
    throw new Error(message);
  }

  logger.error(`${message} (development — broadcast skipped)`);
  return null;
}
