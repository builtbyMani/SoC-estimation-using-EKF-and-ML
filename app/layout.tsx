import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SoC Estimator · EKF + ML Battery State of Charge",
  description:
    "Upload cycling data. An Extended Kalman Filter fuses the physics; a LightGBM model corrects the residual.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${plexMono.variable}`}>
      <body className="min-h-screen bg-background font-display text-ink antialiased">
        <div aria-hidden className="bg-texture pointer-events-none fixed inset-0 z-0" />
        {children}
      </body>
    </html>
  );
}
