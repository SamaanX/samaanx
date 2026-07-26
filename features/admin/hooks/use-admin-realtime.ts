"use client";

import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { queryKeys } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";

export function useAdminRealtime(): void {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.admin.reports(),
            refetchType: "active",
          });
          void queryClient.invalidateQueries({
            queryKey: queryKeys.admin.dashboard(),
            refetchType: "active",
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "disputes" },
        () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.admin.disputes(),
            refetchType: "active",
          });
          void queryClient.invalidateQueries({
            queryKey: queryKeys.admin.dashboard(),
            refetchType: "active",
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.admin.dashboard(),
            refetchType: "active",
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
