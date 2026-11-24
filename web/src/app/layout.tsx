import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist_Mono, Inter } from "next/font/google";
import { RouteLoaderOverlay } from "@/components/RouteLoaderOverlay";
import { WorkspaceModeProvider } from "@/state/workspace-mode";
import { ThemeModeProvider } from "@/state/theme-mode";
import { NigerianArtBackground } from "@/components/theme/NigerianArtBackground";
import { RecordsSync } from "@/components/records/RecordsSync";
import "./globals.css";

const interSans = Inter({
  subsets: ["latin"],
  variable: "--font-ios-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-ios-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#006838",
};

export const metadata: Metadata = {
  title: "NairaBooks — Nigerian IFRS & Tax Act 2025 Workspace",
  description:
    "FRCN IFRS & Nigeria Tax Act 2025 native modular accounting platform for Nigerian SMEs.",
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${interSans.variable} ${geistMono.variable}`}
    >
      <head>
        <script src="/theme-init.js" />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased relative pb-20 md:pb-6">
        <NigerianArtBackground />
        <a href="#main-content" className="nb-skip-link">
          Skip to main content
        </a>
        <ThemeModeProvider>
          <WorkspaceModeProvider>
            <RecordsSync />
            <RouteLoaderOverlay>{children}</RouteLoaderOverlay>
          </WorkspaceModeProvider>
        </ThemeModeProvider>
      </body>
    </html>
  );
}
