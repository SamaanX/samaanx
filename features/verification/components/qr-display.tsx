"use client";

import * as React from "react";

type QrDisplayProps = {
  payload: string;
  label?: string;
};

/** Lazy-load `qrcode` so marketplace bundles stay lean. */
export function QrDisplay({ payload, label = "Scan QR code" }: QrDisplayProps) {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setError(null);

    void import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(payload, {
          margin: 2,
          width: 240,
          color: { dark: "#1048A8", light: "#FFFFFF" },
          errorCorrectionLevel: "M",
        }),
      )
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not render QR code.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [payload]);

  if (error) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {error}
      </p>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className="bg-muted mx-auto size-60 animate-pulse rounded-2xl"
        aria-hidden
      />
    );
  }

  return (
    <figure className="mx-auto w-fit space-y-2 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- QR is a data URL */}
      <img
        src={dataUrl}
        alt={label}
        width={240}
        height={240}
        className="border-border rounded-2xl border bg-white p-2"
      />
      <figcaption className="text-muted-foreground text-xs">{label}</figcaption>
    </figure>
  );
}
