import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist_Mono, Inter } from "next/font/google";
import { RouteLoaderOverlay } from "@/components/RouteLoaderOverlay";
import { WorkspaceModeProvider } from "@/state/workspace-mode";
import { NigerianArtBackground } from "@/components/theme/NigerianArtBackground";
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

export const metadata: Metadata = {
  title: "NairaBooks — Nigerian IFRS & Tax Act 2025 Workspace",
  description:
    "FRCN IFRS & Nigeria Tax Act 2025 native modular accounting platform for Nigerian SMEs.",
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${interSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased relative">
        <NigerianArtBackground />
        <a href="#main-content" className="nb-skip-link">
          Skip to main content
        </a>
        <WorkspaceModeProvider>
          <RouteLoaderOverlay>{children}</RouteLoaderOverlay>
        </WorkspaceModeProvider>
      </body>
    </html>
  );
}
