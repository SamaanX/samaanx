import "server-only";

import { PrismaClient } from "@prisma/client";

import { recordPrismaQuery } from "@/lib/perf/request-metrics";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "stdout", level: "error" },
            { emit: "stdout", level: "warn" },
          ]
        : process.env.PERF_PRISMA_LOG === "1"
          ? [
              { emit: "event", level: "query" },
              { emit: "stdout", level: "error" },
            ]
          : ["error"],
  });

  if (
    process.env.NODE_ENV === "development" ||
    process.env.PERF_PRISMA_LOG === "1"
  ) {
    client.$on("query", (event) => {
      const ms = Number.parseFloat(String(event.duration)) || 0;
      const table =
        /(?:FROM|INTO|UPDATE)\s+(?:public\.)?"?([a-z_]+)"?/i.exec(
          event.query,
        )?.[1] ?? "sql";
      recordPrismaQuery({
        model: table,
        action: event.query.startsWith("SELECT")
          ? "select"
          : event.query.startsWith("INSERT")
            ? "insert"
            : event.query.startsWith("UPDATE")
              ? "update"
              : event.query.startsWith("DELETE")
                ? "delete"
                : "other",
        ms,
      });
      if (ms >= 25) {
        console.warn(
          JSON.stringify({
            level: "debug",
            message: "prisma.query",
            table,
            ms,
          }),
        );
      }
    });
  }

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
