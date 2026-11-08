import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// Link previews need absolute image URLs. Production uses the project's own domain; previews use their deployment URL.
const host = process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;
export const metadata: Metadata = {
  metadataBase: new URL(host ? `https://${host}` : "http://localhost:3000"),
  title: "Tripflow",
  description: "Plan a group trip everyone can say yes to.",
  manifest: "/manifest.webmanifest",
  openGraph: { title: "Tripflow", description: "Plan a group trip everyone can say yes to.", siteName: "Tripflow", type: "website" },
  twitter: { card: "summary_large_image" },
};
export const viewport = { themeColor: "#F4F0E8", width: "device-width", initialScale: 1 };

// Archivo (display), Inter (UI) and Space Mono (meta) are the design fonts. The rest are only for the host's
// AI-designed invite cards (lib/template.ts), which can pick one of them.
const FONTS =
  "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700" +
  "&family=Fraunces:ital,wght@0,600;0,700;1,600&family=Playfair+Display:ital,wght@0,700;1,700&family=Space+Grotesk:wght@500;700&family=Caveat:wght@700&display=swap";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>{children}</body>
    </html>
  );
}
