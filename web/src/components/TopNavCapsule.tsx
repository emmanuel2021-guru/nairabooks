"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  BarChart3,
  LayoutGrid,
  LogOut,
  Scale,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useWorkspaceMode } from "@/state/workspace-mode";
import { ThemeToggle } from "./theme/ThemeToggle";
import { FileSettingsModal } from "./settings/FileSettingsModal";
import { MobileQuickActionFab } from "./mobile/MobileQuickActionFab";

export type NavTabId =
  | "overview"
  | "transactions"
  | "reconcile"
  | "reports"
  | "admin"
  | "books"
  | "people";

interface NavItem {
  readonly id: NavTabId;
  readonly label: string;
  readonly href: string;
  readonly icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: "overview", label: "Overview", href: "/overview", icon: LayoutGrid },
  { id: "transactions", label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { id: "reconcile", label: "Reconcile", href: "/reconcile", icon: Scale },
  { id: "reports", label: "Reports", href: "/reports", icon: BarChart3 },
  { id: "admin", label: "Admin", href: "/admin", icon: ShieldCheck },
];

export function TopNavCapsule({ activeTab }: { readonly activeTab: NavTabId }) {
  const { mode, setMode } = useWorkspaceMode();
  const [isFileSettingsOpen, setIsFileSettingsOpen] = useState(false);

  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <>
      {/* Top Header Capsule (Sticky on all viewports, clean and uncrowded) */}
      <header className="sticky top-0 z-40 px-3 pt-2 sm:px-4 sm:pt-4 pb-2 bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2.5 rounded-2xl md:rounded-full border border-borderSubtle bg-surface px-3 py-2 md:px-4 md:py-2 shadow-sm">
          {/* Brand Logo & Workspace Title */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex min-h-[44px] items-center gap-2 rounded-full px-1 text-sm sm:text-base font-bold tracking-tight text-ink whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm font-sans"
              >
                ₦
              </span>
              <span>NairaBooks</span>
            </Link>
          </div>

          {/* Desktop Primary Workspace Navigation (Centered Floating Capsule) */}
          <nav
            aria-label="Primary workspace navigation"
            className="hidden md:flex md:items-center md:gap-1"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = item.id === activeTab;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive
                      ? "inline-flex items-center justify-center min-h-[44px] px-4 py-2 text-white bg-primary font-semibold rounded-full transition shadow-sm shrink-0 whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary text-sm tracking-tight"
                      : "inline-flex items-center justify-center min-h-[44px] px-4 py-2 text-ink hover:bg-surfaceAlt rounded-full font-medium transition shrink-0 whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary text-sm tracking-tight"
                  }
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Controls: Mode Toggle + Dark Mode Toggle + Settings + Sign Out */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Simple / Pro Mode Switch */}
            <div
              role="group"
              aria-label="Interface complexity mode"
              className="inline-flex items-center rounded-full border border-borderSubtle bg-surfaceAlt p-0.5 sm:p-1"
            >
              <button
                type="button"
                aria-pressed={mode === "simple"}
                onClick={() => setMode("simple")}
                className={
                  mode === "simple"
                    ? "min-h-[36px] sm:min-h-[44px] rounded-full bg-surface px-2.5 sm:px-3.5 py-1 text-[11px] sm:text-xs font-semibold text-ink shadow-sm whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    : "min-h-[36px] sm:min-h-[44px] rounded-full px-2.5 sm:px-3.5 py-1 text-[11px] sm:text-xs font-medium text-mutedInk hover:text-ink whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                }
              >
                Simple
              </button>
              <button
                type="button"
                aria-pressed={mode === "pro"}
                onClick={() => setMode("pro")}
                className={
                  mode === "pro"
                    ? "min-h-[36px] sm:min-h-[44px] rounded-full bg-surface px-2.5 sm:px-3.5 py-1 text-[11px] sm:text-xs font-semibold text-ink shadow-sm whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    : "min-h-[36px] sm:min-h-[44px] rounded-full px-2.5 sm:px-3.5 py-1 text-[11px] sm:text-xs font-medium text-mutedInk hover:text-ink whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                }
              >
                Pro
              </button>
            </div>

            {/* Light / Dark Mode Toggle */}
            <ThemeToggle />

            {/* Settings Gear */}
            <Link
              href="/security"
              title="Settings & File Operations"
              aria-label="Settings"
              aria-haspopup="dialog"
              aria-expanded={isFileSettingsOpen}
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                  e.preventDefault();
                  setIsFileSettingsOpen(true);
                }
              }}
              className="inline-flex min-h-[38px] min-w-[38px] sm:min-h-[44px] sm:min-w-[44px] items-center justify-center rounded-full border border-borderSubtle bg-surface text-ink transition hover:bg-surfaceAlt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
            </Link>

            {/* Sign Out */}
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out"
              aria-label="Sign Out"
              className="inline-flex min-h-[38px] min-w-[38px] sm:min-h-[44px] sm:min-w-[44px] items-center justify-center rounded-full border border-borderSubtle bg-surface text-ink transition hover:bg-surfaceAlt hover:text-[#B91C1C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Flutter-style Bottom Navigation Bar (Mobile only, rendered outside header so no backdrop-blur containment traps it) */}
      <nav
        aria-label="Mobile workspace navigation"
        className="nb-mobile-bottom-nav flex md:hidden items-center justify-around h-16 bg-surface/95 dark:bg-[#1C1C1E]/95 backdrop-blur-lg border-t border-borderSubtle px-2 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] pb-safe"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === activeTab;
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-label={`Mobile ${item.label}`}
              aria-current={isActive ? "page" : undefined}
              className={
                isActive
                  ? "flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 text-primary dark:text-emerald-400 font-bold transition shrink-0 whitespace-nowrap active:scale-95"
                  : "flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 text-mutedInk hover:text-ink transition shrink-0 whitespace-nowrap active:scale-95"
              }
            >
              <div
                className={`flex items-center justify-center h-7 w-12 rounded-full transition ${
                  isActive ? "bg-emerald-100 dark:bg-emerald-950/70" : ""
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="text-[10px] font-semibold tracking-tight mt-0.5">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Flutter-style Floating Action Button (Mobile only) */}
      <MobileQuickActionFab />

      {/* Basic Settings & File Modal Dialog */}
      <FileSettingsModal
        isOpen={isFileSettingsOpen}
        onClose={() => setIsFileSettingsOpen(false)}
      />
    </>
  );
}
