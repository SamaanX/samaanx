import { Button as EmailBtn } from "@react-email/components";
import * as React from "react";

type EmailButtonProps = {
  href: string;
  children: React.ReactNode;
};

export function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <EmailBtn href={href} style={buttonStyle}>
      {children}
    </EmailBtn>
  );
}

const buttonStyle = {
  backgroundColor: "#1B4FD8",
  backgroundImage: "linear-gradient(135deg, #1B4FD8 0%, #16A34A 100%)",
  borderRadius: "12px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: 600,
  lineHeight: "100%",
  padding: "14px 24px",
  textDecoration: "none",
  textAlign: "center" as const,
} as const;
