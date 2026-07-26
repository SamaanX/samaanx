import { cache } from "react";

export type RequestQueryLog = {
  model: string;
  action: string;
  ms: number;
};

export type RequestMetrics = {
  prismaQueryCount: number;
  prismaTotalMs: number;
  authGetUserCount: number;
  authGetSessionCount: number;
  queries: RequestQueryLog[];
};

/** One metrics bag per RSC/action request (React cache). */
export const getRequestMetrics = cache((): RequestMetrics => ({
  prismaQueryCount: 0,
  prismaTotalMs: 0,
  authGetUserCount: 0,
  authGetSessionCount: 0,
  queries: [],
}));

export function recordPrismaQuery(entry: RequestQueryLog): void {
  try {
    const metrics = getRequestMetrics();
    metrics.prismaQueryCount += 1;
    metrics.prismaTotalMs += entry.ms;
    if (metrics.queries.length < 80) {
      metrics.queries.push(entry);
    }
  } catch {
    // Outside a React request (scripts / edge) — ignore.
  }
}

export function recordAuthCall(kind: "getUser" | "getSession"): void {
  try {
    const metrics = getRequestMetrics();
    if (kind === "getUser") metrics.authGetUserCount += 1;
    else metrics.authGetSessionCount += 1;
  } catch {
    // ignore
  }
}

export function summarizeDuplicateQueries(
  queries: RequestQueryLog[],
): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>();
  for (const q of queries) {
    const key = `${q.model}.${q.action}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}
