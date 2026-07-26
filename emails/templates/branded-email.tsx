import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

import { EmailButton } from "@/emails/components/email-button";
import { EmailFooter } from "@/emails/components/email-footer";
import { EmailHeader } from "@/emails/components/email-header";
import { InfoCard } from "@/emails/components/info-card";
import { ListingPreview } from "@/emails/components/listing-preview";
import { RentalSummary } from "@/emails/components/rental-summary";
import { StatusBadge } from "@/emails/components/status-badge";
import type { EmailTemplateKey } from "@/lib/email/types";

export type BrandedEmailProps = {
  templateKey: EmailTemplateKey;
  preview: string;
  headline: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  badgeLabel?: string;
  badgeTone?: "success" | "warning" | "danger" | "info" | "neutral";
  listingTitle?: string;
  listingCity?: string | null;
  listingPrice?: string;
  listingImageUrl?: string | null;
  rentalStart?: string;
  rentalEnd?: string;
  appUrl?: string;
};

export function BrandedEmail({
  preview,
  headline,
  body,
  ctaLabel,
  ctaHref,
  badgeLabel,
  badgeTone = "info",
  listingTitle,
  listingCity,
  listingPrice,
  listingImageUrl,
  rentalStart,
  rentalEnd,
  appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
}: BrandedEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />
          <Section style={content}>
            {badgeLabel ? (
              <StatusBadge label={badgeLabel} tone={badgeTone} />
            ) : null}
            <Text style={headlineStyle}>{headline}</Text>
            <Text style={bodyStyle}>{body}</Text>
            {listingTitle ? (
              <ListingPreview
                title={listingTitle}
                city={listingCity}
                priceLabel={listingPrice}
                imageUrl={listingImageUrl}
              />
            ) : null}
            {listingTitle && rentalStart ? (
              <RentalSummary
                listingTitle={listingTitle}
                startDate={rentalStart}
                endDate={rentalEnd}
                city={listingCity}
              />
            ) : null}
            {!listingTitle && body.length > 120 ? (
              <InfoCard>{body}</InfoCard>
            ) : null}
            {ctaLabel && ctaHref ? (
              <Section
                style={{ textAlign: "center" as const, margin: "28px 0" }}
              >
                <EmailButton href={ctaHref}>{ctaLabel}</EmailButton>
              </Section>
            ) : null}
          </Section>
          <EmailFooter appUrl={appUrl} />
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#F4F6FA",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
} as const;

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #E2E8F0",
  borderRadius: "16px",
  margin: "24px auto",
  maxWidth: "560px",
  padding: "8px 32px 24px",
} as const;

const content = {
  padding: "8px 0 0",
} as const;

const headlineStyle = {
  color: "#0F172A",
  fontSize: "22px",
  fontWeight: 700,
  lineHeight: "28px",
  margin: "0 0 12px",
} as const;

const bodyStyle = {
  color: "#334155",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 8px",
  whiteSpace: "pre-wrap" as const,
} as const;

export default BrandedEmail;
