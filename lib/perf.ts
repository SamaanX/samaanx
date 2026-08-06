import {
  getRequestMetrics,
  summarizeDuplicateQueries,
} from "@/lib/perf/request-metrics";

/**
 * Lightweight request timing for performance investigation.
 * Emits structured debug logs in development only.
 */
export function perfStart(label: string): () => number {
  let startMetrics: ReturnType<typeof snapshotMetrics> | null = null;
  try {
    startMetrics = snapshotMetrics();
  } catch {
    startMetrics = null;
  }

  const start = performance.now();

  return () => {
    const ms = Math.round(performance.now() - start);
    const shouldLog =
      process.env.NODE_ENV === "development" || process.env.PERF_LOG === "1";

    if (shouldLog) {
      let prismaQueries = 0;
      let prismaMs = 0;
      let authGetUser = 0;
      let duplicates: Array<{ key: string; count: number }> = [];
      try {
        const end = snapshotMetrics();
        if (startMetrics) {
          prismaQueries = end.prismaQueryCount - startMetrics.prismaQueryCount;
          prismaMs = Math.round(end.prismaTotalMs - startMetrics.prismaTotalMs);
          authGetUser = end.authGetUserCount - startMetrics.authGetUserCount;
          const slice = end.queries.slice(startMetrics.queries.length);
          duplicates = summarizeDuplicateQueries(slice);
        }
      } catch {
        // ignore
      }

      console.warn(
        JSON.stringify({
          level: "debug",
          message: "perf",
          label,
          ms,
          prismaQueries,
          prismaMs,
          authGetUser,
          duplicateQueries: duplicates,
          timestamp: new Date().toISOString(),
        }),
      );
    }
    return ms;
  };
}

function snapshotMetrics() {
  const m = getRequestMetrics();
  return {
    prismaQueryCount: m.prismaQueryCount,
    prismaTotalMs: m.prismaTotalMs,
    authGetUserCount: m.authGetUserCount,
    queries: m.queries,
  };
}

export async function withPerf<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  const end = perfStart(label);
  try {
    return await fn();
  } finally {
    end();
  }
}
