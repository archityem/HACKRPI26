import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "Elsewhere", description: "Plan a group trip everyone can say yes to." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:ital,wght@0,600;0,700;1,600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
