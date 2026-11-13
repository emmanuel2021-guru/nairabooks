"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { useWorkspaceMode } from "@/state/workspace-mode";
import { FileSettingsModal } from "./settings/FileSettingsModal";

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
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: "overview", label: "Overview", href: "/overview" },
  { id: "transactions", label: "Transactions", href: "/transactions" },
  { id: "reconcile", label: "Reconcile", href: "/reconcile" },
  { id: "reports", label: "Reports", href: "/reports" },
  { id: "admin", label: "Admin", href: "/admin" },
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
    <header className="sticky top-0 z-40 px-3 pt-2.5 pb-2 sm:px-4 sm:pt-4 bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap md:flex-nowrap items-center justify-between gap-2.5 rounded-2xl md:rounded-full border border-borderSubtle bg-surface px-3 py-2 md:px-4 md:py-2 shadow-sm">
        {/* Brand Logo (order-1 on all viewports) */}
        <div className="flex items-center gap-2 order-1">
          <Link
            href="/"
            className="flex min-h-[44px] items-center gap-2 rounded-full px-1 text-sm sm:text-base font-bold tracking-tight text-ink whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm"
            >
              ₦
            </span>
            <span>NairaBooks</span>
          </Link>
        </div>

        {/* Controls: Mode Toggle + Settings + Sign Out (order-2 on mobile, order-3 on desktop) */}
        <div className="flex items-center gap-1.5 sm:gap-2 order-2 md:order-3">
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

        {/* Unified Responsive Navigation (order-3 full-width pill ribbon on mobile, order-2 inline on desktop) */}
        <nav
          aria-label="Primary workspace navigation"
          className="order-3 md:order-2 flex w-full md:w-auto items-center gap-1.5 md:gap-1 overflow-x-auto no-scrollbar pt-2 md:pt-0 border-t border-borderSubtle/60 md:border-t-0 mt-1.5 md:mt-0"
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
                    ? "inline-flex min-h-[36px] md:min-h-[44px] items-center rounded-full bg-primary px-3.5 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-white whitespace-nowrap transition shadow-sm shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    : "inline-flex min-h-[36px] md:min-h-[44px] items-center rounded-full px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-ink hover:bg-surfaceAlt whitespace-nowrap transition shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <FileSettingsModal
        isOpen={isFileSettingsOpen}
        onClose={() => setIsFileSettingsOpen(false)}
      />
    </header>
  );
}
