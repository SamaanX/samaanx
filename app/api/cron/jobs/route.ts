import { NextResponse } from "next/server";

import {
  enqueueWeeklyDigestJobs,
  processDueScheduledJobs,
} from "@/features/jobs/processor";

export const runtime = "nodejs";

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/** Background job runner — call via cron (Vercel cron / external scheduler). */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? "due";

  if (mode === "weekly") {
    const queued = await enqueueWeeklyDigestJobs();
    return NextResponse.json({ ok: true, queued });
  }

  const result = await processDueScheduledJobs();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return POST(request);
}
