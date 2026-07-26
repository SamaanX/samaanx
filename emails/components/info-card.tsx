import { Section, Text } from "@react-email/components";
import * as React from "react";

type InfoCardProps = {
  title?: string;
  children: React.ReactNode;
};

export function InfoCard({ title, children }: InfoCardProps) {
  return (
    <Section style={cardStyle}>
      {title ? <Text style={titleStyle}>{title}</Text> : null}
      <Text style={bodyStyle}>{children}</Text>
    </Section>
  );
}

const cardStyle = {
  backgroundColor: "#F8FAFC",
  border: "1px solid #E2E8F0",
  borderRadius: "12px",
  padding: "16px 20px",
  margin: "16px 0",
} as const;

const titleStyle = {
  color: "#0F172A",
  fontSize: "14px",
  fontWeight: 600,
  margin: "0 0 8px",
} as const;

const bodyStyle = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "22px",
  margin: 0,
  whiteSpace: "pre-wrap" as const,
} as const;
