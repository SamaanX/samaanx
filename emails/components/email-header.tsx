import { Heading, Section, Text } from "@react-email/components";
import * as React from "react";

const APP_NAME = "SamaanX";
const TAGLINE = "Apki Cheez, Apki Income";

type EmailHeaderProps = {
  preview?: string;
};

export function EmailHeader({ preview }: EmailHeaderProps) {
  return (
    <Section style={{ padding: "24px 0 8px", textAlign: "center" as const }}>
      {preview ? <Text style={previewStyle}>{preview}</Text> : null}
      <Heading style={logoStyle}>{APP_NAME}</Heading>
      <Text style={taglineStyle}>{TAGLINE}</Text>
    </Section>
  );
}

const previewStyle = {
  display: "none",
  overflow: "hidden",
  maxHeight: 0,
  maxWidth: 0,
  opacity: 0,
} as const;

const logoStyle = {
  color: "#1B4FD8",
  fontSize: "28px",
  fontWeight: 700,
  margin: "0 0 4px",
  letterSpacing: "-0.02em",
} as const;

const taglineStyle = {
  color: "#64748B",
  fontSize: "13px",
  margin: 0,
} as const;
