"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NairaBooksLoader } from "@/components/NairaBooksLoader";

const DEMO_PERSONAS: readonly {
  readonly label: string;
  readonly email: string;
  readonly badge: string;
}[] = [
  {
    label: "Owner / MD",
    email: "owner@lagostrading.ng",
    badge: "Full control + multi-company",
  },
  {
    label: "Chartered Accountant CFO",
    email: "cfo@lagostrading.ng",
    badge: "Post, reverse & CAMA sign-off",
  },
  {
    label: "Bookkeeper",
    email: "clerk@lagostrading.ng",
    badge: "Post vouchers & tax entries",
  },
  {
    label: "Branch Cashier",
    email: "cashier@lagostrading.ng",
    badge: "POS & daily receipts",
  },
  {
    label: "External Auditor (Read-Only)",
    email: "auditor@icanaudit.ng",
    badge: "FRCN statements & audit log",
  },
];

/** `demoPassword` is null when the server has no demo accounts; the demo drawer is then hidden. */
export function LoginWorkspace({ demoPassword = null }: { readonly demoPassword?: string | null } = {}) {
  const prefersReduced = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [redirectingOverlay, setRedirectingOverlay] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const startedAt = Date.now();
    let redirecting = false;
    setSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json()) as {
        message?: string;
        user?: { fullName: string };
        workspace?: { legalName: string };
      };
      if (!res.ok) {
        setErrorMessage(body.message ?? "Invalid email or password.");
        return;
      }

      redirecting = true;
      setRedirectingOverlay(true);
      setStatusMessage(
        `Signed in as ${body.user?.fullName ?? email} (${body.workspace?.legalName ?? "Workspace"}).`,
      );
      const minDuration = prefersReduced ? 350 : 1400;
      const remaining = Math.max(0, minDuration - (Date.now() - startedAt));
      if (remaining > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remaining));
      }
      window.location.assign("/overview");
    } catch {
      setErrorMessage("Network error while authenticating. Please try again.");
    } finally {
      if (!redirecting) {
        setSubmitting(false);
      }
    }
  }

  function handleSelectDemoPersona(persona: (typeof DEMO_PERSONAS)[number]) {
    if (!demoPassword) return;
    setEmail(persona.email);
    setPassword(demoPassword);
    setErrorMessage(null);
    setStatusMessage(`Filled ${persona.label} credentials — ready to sign in.`);
  }

  return (
    <MotionConfig reducedMotion="user">
      {redirectingOverlay && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F2F2F7]">
          <NairaBooksLoader heading="Opening your NairaBooks workspace..." />
        </div>
      )}

      <main
        id="main-content"
        className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-4 py-12 sm:px-6"
      >
        {/* Subtle Apple Studio Ambient Background */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-[-10%] h-[360px] w-[460px] -translate-x-1/2 rounded-full bg-[#006838]/[0.055] blur-3xl" />
        </div>

        <motion.div
          initial={prefersReduced ? false : { y: 12, scale: 0.99 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative z-10 w-full max-w-[420px]"
        >
          {/* Minimalist Elevated Cupertino Sign-In Surface */}
          <section
            aria-labelledby="login-heading"
            className="rounded-[28px] border border-[#E5E5EA] bg-white p-7 shadow-[0_24px_60px_rgba(28,28,30,0.06)] sm:p-9"
          >
            <div className="mb-6">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#006838] font-mono text-lg font-extrabold text-white shadow-[0_8px_18px_rgba(0,104,56,0.24)]">
                ₦
              </div>
              <h1
                id="login-heading"
                className="mt-5 text-[26px] font-bold leading-[1.15] tracking-[-0.03em] text-[#1C1C1E]"
              >
                Sign in to NairaBooks
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-[#5E5E64]">
                Clean bookkeeping for your Nigerian business.
              </p>
            </div>

            {errorMessage ? (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-5 rounded-[14px] border border-[#DC2626]/30 bg-[#FEF2F2] px-4 py-3 text-xs font-medium text-[#B91C1C]"
              >
                {errorMessage}
              </div>
            ) : null}

            {statusMessage && !errorMessage ? (
              <div
                role="status"
                aria-live="polite"
                className="mb-5 rounded-[14px] border border-[#006838]/25 bg-[#E6F5ED] px-4 py-3 text-xs font-medium text-[#00582E]"
              >
                {statusMessage}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-[13px] font-semibold tracking-[-0.01em] text-[#1C1C1E]"
                >
                  Work Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 min-h-[48px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-4 text-[15px] text-[#1C1C1E] placeholder:text-[#636369] transition focus:border-[#006838] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006838]/20"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-[13px] font-semibold tracking-[-0.01em] text-[#1C1C1E]"
                >
                  Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="min-h-[48px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] pl-4 pr-12 text-[15px] text-[#1C1C1E] placeholder:text-[#636369] transition focus:border-[#006838] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006838]/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[10px] text-[#5E5E64] transition hover:bg-[#E5E5EA]/60 hover:text-[#1C1C1E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006838]"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="emerald"
                  size="lg"
                  disabled={submitting}
                  className="w-full rounded-full"
                >
                  <span>{submitting ? "Verifying Credentials..." : "Sign In to Workspace"}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </form>

            <div className="mt-7 flex items-center justify-between gap-2 border-t border-[#E5E5EA] pt-5 text-xs">
              <span className="text-[#5E5E64]">New Nigerian company?</span>
              <Link
                href="/signup"
                className="inline-flex min-h-[36px] items-center font-semibold text-[#00582E] underline-offset-4 hover:underline"
              >
                Create a new account &rarr;
              </Link>
            </div>
          </section>

          {/* Quiet Collapsible Demo Role Drawer — only when the server has demo accounts */}
          {demoPassword ? (
          <div className="mt-5 flex flex-col items-center">
            <button
              type="button"
              aria-expanded={showDemoDrawer}
              aria-controls="demo-role-drawer"
              onClick={() => setShowDemoDrawer((prev) => !prev)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-[#5E5E64] transition hover:bg-white/80 hover:text-[#1C1C1E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006838]"
            >
              <KeyRound className="h-3.5 w-3.5 text-[#006838]" aria-hidden="true" />
              <span>Try a demo role (5 Nigerian accounts)</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  showDemoDrawer ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            {showDemoDrawer && (
              <motion.div
                id="demo-role-drawer"
                initial={prefersReduced ? false : { y: -6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="mt-2 w-full overflow-hidden rounded-[22px] border border-[#E5E5EA] bg-white shadow-[0_12px_32px_rgba(28,28,30,0.06)]"
              >
                <div className="border-b border-[#E5E5EA] bg-[#FAFAFC] px-4 py-2.5 text-left">
                  <p className="text-[11px] font-medium text-[#5E5E64]">
                    Tap any role to auto-fill credentials (password:{" "}
                    <code className="font-mono font-semibold text-[#1C1C1E]">{demoPassword}</code>)
                  </p>
                </div>
                <div className="divide-y divide-[#E5E5EA]">
                  {DEMO_PERSONAS.map((persona) => {
                    const selected = email === persona.email;
                    return (
                      <button
                        key={persona.email}
                        type="button"
                        onClick={() => handleSelectDemoPersona(persona)}
                        className={`flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition ${
                          selected
                            ? "bg-[#E6F5ED]/80"
                            : "bg-white hover:bg-[#FAFAFC]"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-semibold text-[#1C1C1E]">
                            {persona.label}
                          </p>
                          <p className="text-[11px] text-[#5E5E64]">{persona.badge}</p>
                        </div>
                        {selected ? (
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#006838] text-white">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] font-medium text-[#5E5E64]">
                            Fill
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
          ) : null}
        </motion.div>
      </main>
    </MotionConfig>
  );
}
