import { Img, Section, Text } from "@react-email/components";
import * as React from "react";

type ListingPreviewProps = {
  title: string;
  city?: string | null;
  priceLabel?: string;
  imageUrl?: string | null;
};

export function ListingPreview({
  title,
  city,
  priceLabel,
  imageUrl,
}: ListingPreviewProps) {
  return (
    <Section style={wrapStyle}>
      {imageUrl ? (
        <Img
          src={imageUrl}
          alt=""
          width={280}
          height={160}
          style={{
            borderRadius: "12px",
            objectFit: "cover" as const,
            marginBottom: "12px",
          }}
        />
      ) : null}
      <Text style={titleStyle}>{title}</Text>
      {city ? <Text style={metaStyle}>{city}</Text> : null}
      {priceLabel ? <Text style={priceStyle}>{priceLabel}</Text> : null}
    </Section>
  );
}

const wrapStyle = {
  backgroundColor: "#F8FAFC",
  border: "1px solid #E2E8F0",
  borderRadius: "12px",
  padding: "16px",
  margin: "16px 0",
} as const;

const titleStyle = {
  color: "#0F172A",
  fontSize: "15px",
  fontWeight: 600,
  margin: "0 0 4px",
} as const;

const metaStyle = {
  color: "#64748B",
  fontSize: "13px",
  margin: "0 0 4px",
} as const;

const priceStyle = {
  color: "#16A34A",
  fontSize: "14px",
  fontWeight: 600,
  margin: 0,
} as const;
