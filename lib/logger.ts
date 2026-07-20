type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function shouldLog(level: LogLevel): boolean {
  if (process.env.NODE_ENV === "production") {
    return level === "warn" || level === "error";
  }

  return true;
}

function write(level: LogLevel, message: string, context?: LogContext) {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? { context } : {}),
  };

  // Structured logging abstraction — swap for Sentry/etc. in later phases.
  const line = JSON.stringify(payload);

  if (level === "debug") {
    console.warn(line);
    return;
  }

  console[level](line);
}

export const logger = {
  debug(message: string, context?: LogContext) {
    write("debug", message, context);
  },
  info(message: string, context?: LogContext) {
    write("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    write("warn", message, context);
  },
  error(message: string, context?: LogContext) {
    write("error", message, context);
  },
};
