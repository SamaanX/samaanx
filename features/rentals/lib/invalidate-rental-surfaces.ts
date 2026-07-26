import type { QueryClient } from "@tanstack/react-query";

import { bumpLiveSurfaces } from "@/features/realtime/live-sync";

/** @deprecated Prefer afterLiveMutation / bumpLiveSurfaces — kept for call-site compat. */
export function invalidateRentalSurfaces(queryClient: QueryClient): void {
  bumpLiveSurfaces(queryClient);
}
