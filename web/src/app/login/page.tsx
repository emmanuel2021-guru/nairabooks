import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { LoginWorkspace } from "@/components/LoginWorkspace";
import { resolveAuthRuntimeConfig } from "@/lib/auth-config";

export const metadata: Metadata = {
  title: "Sign In | NairaBooks",
  description:
    "Sign in cleanly to your NairaBooks workspace for Nigerian double-entry bookkeeping and Tax Act 2025 compliance.",
};

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const demoPassword = resolveAuthRuntimeConfig().demoPassword;
  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1C1C1E]">
      {/* Featherweight Minimalist Cupertino Header */}
      <header className="nb-ios-glass sticky top-0 z-30 border-b border-[#E5E5EA]/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 text-base font-bold tracking-[-0.03em] text-[#1C1C1E]"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#006838] font-mono text-xs font-extrabold text-white shadow-sm">
              ₦
            </span>
            <span>nairabooks</span>
          </Link>

          <Link
            href="/signup"
            className="inline-flex min-h-[40px] items-center rounded-full border border-[#D1D1D6] bg-white px-4 py-1.5 text-xs font-semibold text-[#1C1C1E] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:bg-[#F8F8FA]"
          >
            Create Account
          </Link>
        </div>
      </header>

      <LoginWorkspace demoPassword={demoPassword} />
    </div>
  );
}
