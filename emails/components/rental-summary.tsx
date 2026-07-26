import { Section, Text } from "@react-email/components";
import * as React from "react";

type RentalSummaryProps = {
  listingTitle: string;
  startDate?: string;
  endDate?: string;
  city?: string | null;
};

export function RentalSummary({
  listingTitle,
  startDate,
  endDate,
  city,
}: RentalSummaryProps) {
  return (
    <Section style={wrapStyle}>
      <Text style={labelStyle}>Rental</Text>
      <Text style={titleStyle}>{listingTitle}</Text>
      {startDate && endDate ? (
        <Text style={metaStyle}>
          {startDate} → {endDate}
        </Text>
      ) : null}
      {city ? <Text style={metaStyle}>{city}</Text> : null}
    </Section>
  );
}

const wrapStyle = {
  borderLeft: "4px solid #1B4FD8",
  paddingLeft: "16px",
  margin: "16px 0",
} as const;

const labelStyle = {
  color: "#64748B",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.06em",
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
} as const;

const titleStyle = {
  color: "#0F172A",
  fontSize: "16px",
  fontWeight: 600,
  margin: "0 0 4px",
} as const;

const metaStyle = {
  color: "#64748B",
  fontSize: "13px",
  margin: "0 0 2px",
} as const;
