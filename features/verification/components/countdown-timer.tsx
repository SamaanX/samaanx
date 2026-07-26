"use client";

import * as React from "react";

type CountdownTimerProps = {
  expiresAt: string;
  onExpire?: () => void;
};

export function CountdownTimer({ expiresAt, onExpire }: CountdownTimerProps) {
  const [remainingMs, setRemainingMs] = React.useState(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now()),
  );
  const expiredRef = React.useRef(false);

  React.useEffect(() => {
    expiredRef.current = false;
    const tick = () => {
      const next = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setRemainingMs(next);
      if (next <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, onExpire]);

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const expired = remainingMs <= 0;

  return (
    <p
      className={
        expired
          ? "text-destructive text-sm font-medium"
          : "text-brand-blue text-sm font-medium"
      }
      aria-live="polite"
    >
      {expired
        ? "Codes expired"
        : `Expires in ${minutes}:${seconds.toString().padStart(2, "0")}`}
    </p>
  );
}
