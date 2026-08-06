import {
  getRequestMetrics,
  summarizeDuplicateQueries,
} from "@/lib/perf/request-metrics";

function shouldLogRequestSummary(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.PERF_REQUEST_SUMMARY === "1"
  );
}

/**
 * Emit a single request-level summary (Prisma + auth dedupe).
 * Call from route/layout boundaries when investigating latency.
 */
export function logRequestSummary(route: string): void {
  if (!shouldLogRequestSummary()) {
    return;
  }

  try {
    const metrics = getRequestMetrics();
    const duplicates = summarizeDuplicateQueries(metrics.queries);
    const slowQueries = metrics.queries.filter((query) => query.ms >= 25);

    console.warn(
      JSON.stringify({
        level: "warn",
        message: "perf.request_summary",
        route,
        prismaQueryCount: metrics.prismaQueryCount,
        prismaTotalMs: Math.round(metrics.prismaTotalMs),
        authGetUserCount: metrics.authGetUserCount,
        authGetSessionCount: metrics.authGetSessionCount,
        duplicateQueries: duplicates.slice(0, 10),
        slowQueries: slowQueries.slice(0, 15),
        timestamp: new Date().toISOString(),
      }),
    );
  } catch {
    // Outside React request scope — ignore.
  }
}
