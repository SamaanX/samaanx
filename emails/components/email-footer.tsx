import { Hr, Link, Section, Text } from "@react-email/components";
import * as React from "react";

type EmailFooterProps = {
  appUrl?: string;
};

export function EmailFooter({
  appUrl = "https://samaanx.com",
}: EmailFooterProps) {
  return (
    <Section style={{ padding: "24px 0 8px" }}>
      <Hr style={{ borderColor: "#E2E8F0", margin: "24px 0" }} />
      <Text style={footerText}>
        You are receiving this email because you have a SamaanX account. Manage
        your notification preferences in{" "}
        <Link href={`${appUrl}/profile#notifications`} style={linkStyle}>
          Profile settings
        </Link>
        .
      </Text>
      <Text style={footerMuted}>
        © {new Date().getFullYear()} SamaanX · Pakistan
      </Text>
      <Text style={footerMuted}>
        <Link href={appUrl} style={linkStyle}>
          samaanx.com
        </Link>
      </Text>
    </Section>
  );
}

const footerText = {
  color: "#475569",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 8px",
} as const;

const footerMuted = {
  color: "#94A3B8",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 4px",
} as const;

const linkStyle = {
  color: "#1B4FD8",
  textDecoration: "underline",
} as const;
