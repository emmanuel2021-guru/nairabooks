"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { MotionConfig, motion, useScroll, useSpring } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NairaBooksLoader } from "@/components/NairaBooksLoader";
import { CashflowStorySection } from "@/components/landing/CashflowStorySection";
import { HeroShowcaseSection } from "@/components/landing/HeroShowcaseSection";
import { LiveRailsStrip } from "@/components/landing/LiveRailsStrip";
import { ProductPreviewWindow } from "@/components/landing/ProductPreviewWindow";
import { AnimatedSection, RevealBlock } from "@/components/landing/SectionMotion";
import { SectorAndFaqSections } from "@/components/landing/SectorAndFaqSections";
import type { AuthSessionPayload } from "@/types/auth";

const NAV_ITEMS = [
  { id: "top", href: "#top", label: "Home" },
  { id: "live-preview", href: "#live-preview", label: "Live Preview" },
  { id: "sectors", href: "#sectors", label: "Business Types" },
  { id: "faq", href: "#faq", label: "Help" },
] as const;

export function LandingPageClient({
  activeSession,
}: {
  readonly activeSession: AuthSessionPayload | null;
}) {
  const [activeNavId, setActiveNavId] = useState<string>("top");
  const [loaderPreviewOpen, setLoaderPreviewOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 26,
    restDelta: 0.001,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    const targets = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActiveNavId(visible.target.id);
        }
      },
      { rootMargin: "-25% 0px -45% 0px", threshold: [0.1, 0.3, 0.6] },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-transparent text-[#1C1C1E]">
        {/* iOS Vibrancy Translucent Top Header + Sliding Section Pill */}
        <header className="nb-ios-glass sticky top-0 z-30 border-b border-[#E5E5EA]">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center gap-2 text-lg font-bold tracking-[-0.04em] text-[#1C1C1E]"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-[9px] bg-[#006838] font-mono text-xs font-bold text-white shadow-sm">
                ₦
              </span>
              <span>nairabooks</span>
            </Link>

            <nav
              aria-label="Primary sections"
              className="hidden items-center gap-1.5 rounded-full bg-[#E5E5EA]/70 p-1 text-sm font-medium text-[#5E5E64] md:flex"
            >
              {NAV_ITEMS.map((item) => {
                const isActive = activeNavId === item.id;
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={() => setActiveNavId(item.id)}
                    className={`relative inline-flex min-h-[34px] items-center rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
                      isActive ? "text-[#1C1C1E]" : "text-[#5E5E64] hover:text-[#1C1C1E]"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="landing-nav-pill"
                        transition={{ type: "spring", stiffness: 360, damping: 28 }}
                        className="absolute inset-0 rounded-full border border-[#1C1C1E]/15 bg-white shadow-sm"
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </a>
                );
              })}
            </nav>

            <nav aria-label="Landing actions" className="flex items-center gap-1.5 sm:gap-2">
              {activeSession ? (
                <Button asChild className="rounded-full px-3.5 sm:px-5 text-xs sm:text-sm">
                  <Link href="/overview">
                    <span className="hidden sm:inline">Open </span>Workspace
                    <ArrowRight className="h-4 w-4 ml-1" strokeWidth={2.2} aria-hidden="true" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button variant="ghost" asChild className="rounded-full px-2.5 sm:px-4 text-xs sm:text-sm">
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button asChild className="rounded-full px-3.5 sm:px-5 text-xs sm:text-sm bg-[#006838] hover:bg-[#00582E]">
                    <Link href="/signup">
                      <span className="hidden sm:inline">Contact &amp; </span>Start Free
                    </Link>
                  </Button>
                </>
              )}
            </nav>
          </div>

          <motion.div
            aria-hidden="true"
            style={{ scaleX: smoothProgress, transformOrigin: "0% 50%" }}
            className="h-[2px] w-full bg-[#006838]"
          />
        </header>

        <main id="main-content" className="pb-sticky-clearance">
          <div id="top" className="scroll-mt-20">
            <HeroShowcaseSection />
          </div>

          <LiveRailsStrip />

          {/* Interactive iOS App Preview Window with Scroll Entrance */}
          <AnimatedSection
            id="live-preview"
            className="scroll-mt-20 border-b border-[#E5E5EA] bg-white py-14 sm:py-16"
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                <RevealBlock delay={0.04} className="max-w-xl space-y-2">
                  <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#006838]">
                    Try It Live Below
                  </p>
                  <h2 className="text-2xl font-black tracking-[-0.03em] text-[#1C1C1E] sm:text-3xl lg:text-4xl">
                    See how daily Nigerian money turns into{" "}
                    <span className="bg-gradient-to-r from-[#006838] to-[#047857] bg-clip-text text-transparent">
                      clean, balanced books
                    </span>
                    .
                  </h2>
                </RevealBlock>
                <RevealBlock delay={0.12}>
                  <Button variant="outline" asChild>
                    <Link href="/overview">Open Full Sample Workspace</Link>
                  </Button>
                </RevealBlock>
              </div>

              <RevealBlock delay={0.16} yOffset={44}>
                <ProductPreviewWindow />
              </RevealBlock>
            </div>
          </AnimatedSection>

          {/* Animated Sale Split & Quarterly Cashflow Stories */}
          <CashflowStorySection />

          {/* 6 Business Sectors, Comparison Table & Short Human FAQ */}
          <SectorAndFaqSections />

          {/* Crisp iOS Bottom CTA Card */}
          <AnimatedSection
            className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8"
            accentLine={false}
          >
            <RevealBlock yOffset={40}>
              <Card className="relative overflow-hidden bg-white">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#E6F5ED]/90 blur-2xl"
                />
                <CardContent className="relative flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center sm:p-10">
                  <div className="max-w-xl space-y-1.5">
                    <h2 className="text-2xl font-bold tracking-[-0.025em] text-[#1C1C1E] sm:text-3xl">
                      Ready to see your own numbers clearly?
                    </h2>
                    <p className="text-sm leading-relaxed text-[#5E5E64] sm:text-base">
                      Open a workspace in two minutes or explore the sample Lagos
                      business live before adding your own records.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button size="lg" variant="emerald" asChild>
                      <Link href="/signup">
                        Create Free Account
                        <ArrowRight className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <Link href="/login">Sign In</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </RevealBlock>
          </AnimatedSection>
        </main>

        <footer className="border-t border-[#E5E5EA] bg-white py-8 text-sm text-[#5E5E64]">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <p className="font-semibold text-[#1C1C1E]">
              nairabooks · Clean bookkeeping built for Nigerian businesses
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={() => setLoaderPreviewOpen(true)}
                className="min-h-[44px] rounded-full border border-[#D1D1D6] bg-[#F8F8FA] px-3.5 py-1.5 text-xs font-semibold text-[#00582E] transition hover:bg-[#E6F5ED]"
              >
                Play Loader Vibes
              </button>
              <Link href="/overview" className="hover:text-[#1C1C1E]">
                Live Demo
              </Link>
              <Link href="/login" className="hover:text-[#1C1C1E]">
                Sign In
              </Link>
              <Link href="/signup" className="hover:text-[#1C1C1E]">
                Create Account
              </Link>
            </div>
          </div>
        </footer>

        <Dialog open={loaderPreviewOpen} onOpenChange={setLoaderPreviewOpen}>
          <DialogContent className="max-w-lg rounded-[28px] border-[#E5E5EA] bg-[#F2F2F7] p-5">
            <DialogHeader>
              <DialogTitle className="text-lg text-[#1C1C1E]">
                NairaBooks Dynamic Route Loader
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5E5E64]">
                Every time a route opens, NairaBooks picks a fresh animated scene so loading never looks repetitive.
              </DialogDescription>
            </DialogHeader>
            <NairaBooksLoader compact />
          </DialogContent>
        </Dialog>
      </div>
    </MotionConfig>
  );
}
