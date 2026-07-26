import { logger } from "@/lib/logger";

type TimelineStep = {
  label: string;
  ms: number;
  stepMs: number;
  meta?: Record<string, unknown>;
};

/**
 * Server-action step timer — logs a full timeline when done.
 * Slow steps (>100ms) log immediately; steps >300ms include a warning flag.
 */
export class ActionTimeline {
  private readonly start = performance.now();
  private lastMark = this.start;
  private readonly steps: TimelineStep[] = [];

  mark(label: string, meta?: Record<string, unknown>): void {
    const now = performance.now();
    const ms = Math.round(now - this.start);
    const stepMs = Math.round(now - this.lastMark);
    this.lastMark = now;
    this.steps.push({ label, ms, stepMs, meta });

    if (stepMs > 100) {
      logger.warn("listing.publish.slow_step", {
        label,
        stepMs,
        ms,
        ...(meta ?? {}),
        ...(stepMs > 300 ? { exceeds300ms: true } : {}),
      });
    }
  }

  done(action: string): void {
    const totalMs = Math.round(performance.now() - this.start);
    const slowSteps = this.steps.filter((step) => step.stepMs > 300);

    const timeline = this.steps
      .map((step) => `${step.ms}ms ${step.label} (+${step.stepMs}ms)`)
      .join("\n");

    logger.warn("listing.publish.timeline", {
      action,
      totalMs,
      steps: this.steps,
      slowSteps: slowSteps.map((step) => ({
        label: step.label,
        stepMs: step.stepMs,
        ms: step.ms,
      })),
      timeline,
    });

    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[listing.publish] ${action} — ${totalMs}ms\n${timeline}\nDone`,
      );
    }
  }
}

export async function timed<T>(
  timeline: ActionTimeline,
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } finally {
    timeline.mark(label);
  }
}
