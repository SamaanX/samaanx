import { Text } from "@react-email/components";
import * as React from "react";

export type EmailStatusTone =
  "success" | "warning" | "danger" | "info" | "neutral";

type StatusBadgeProps = {
  label: string;
  tone?: EmailStatusTone;
};

const TONE_COLORS: Record<EmailStatusTone, { bg: string; text: string }> = {
  success: { bg: "#DCFCE7", text: "#166534" },
  warning: { bg: "#FEF3C7", text: "#92400E" },
  danger: { bg: "#FEE2E2", text: "#991B1B" },
  info: { bg: "#DBEAFE", text: "#1E40AF" },
  neutral: { bg: "#F1F5F9", text: "#475569" },
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  const colors = TONE_COLORS[tone];
  return (
    <Text
      style={{
        backgroundColor: colors.bg,
        borderRadius: "999px",
        color: colors.text,
        display: "inline-block",
        fontSize: "12px",
        fontWeight: 600,
        margin: "0 0 16px",
        padding: "6px 12px",
      }}
    >
      {label}
    </Text>
  );
}
