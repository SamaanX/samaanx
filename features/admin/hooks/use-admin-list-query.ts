"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

type UseAdminListQueryOptions<TData, TParams> = {
  queryKey: readonly unknown[];
  fetcher: (params: TParams) => Promise<TData>;
  params: TParams;
  initialParams: TParams;
  initialData: TData;
};

export function useAdminListQuery<TData, TParams>({
  queryKey,
  fetcher,
  params,
  initialParams,
  initialData,
}: UseAdminListQueryOptions<TData, TParams>) {
  const isInitialParams =
    JSON.stringify(params) === JSON.stringify(initialParams);

  return useQuery({
    queryKey,
    queryFn: () => fetcher(params),
    initialData: isInitialParams ? initialData : undefined,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });
}

export function useInvalidateAdminList() {
  const queryClient = useQueryClient();
  return (queryKeyPrefix: readonly unknown[]) => {
    void queryClient.invalidateQueries({
      queryKey: queryKeyPrefix,
      refetchType: "active",
    });
  };
}
