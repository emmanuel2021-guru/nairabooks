"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowRight, PlayCircle, Plus, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

const LIVE_ALERTS = [
  { id: "pos", app: "Moniepoint POS", detail: "18 sales settled", amount: "+₦413,700" },
  { id: "bank", app: "Zenith Bank PDF", detail: "Auto-matched alert", amount: "+₦2,500,000" },
  { id: "vat", app: "Tax Pot (7.5%)", detail: "Safely set aside", amount: "₦29,302" },
] as const;

const SPARK_AMOUNTS = ["+₦420,000", "+₦1,150,000", "+₦2,637,500"] as const;

export function HeroShowcaseSection() {
  const prefersReduced = useReducedMotion();
  const [alertIndex, setAlertIndex] = useState(0);
  const [sparkIndex, setSparkIndex] = useState(0);
  const { scrollY } = useScroll();
  const watermarkX = useTransform(scrollY, [0, 600], [0, -70]);
  const portraitY = useTransform(scrollY, [0, 600], [0, 32]);

  useEffect(() => {
    if (prefersReduced) return;
    const alertTimer = window.setInterval(() => {
      setAlertIndex((prev) => (prev + 1) % LIVE_ALERTS.length);
    }, 2800);
    const sparkTimer = window.setInterval(() => {
      setSparkIndex((prev) => (prev + 1) % SPARK_AMOUNTS.length);
    }, 3200);
    return () => {
      window.clearInterval(alertTimer);
      window.clearInterval(sparkTimer);
    };
  }, [prefersReduced]);

  const currentAlert = LIVE_ALERTS[alertIndex] ?? LIVE_ALERTS[0];
  const currentSparkAmount = SPARK_AMOUNTS[sparkIndex] ?? SPARK_AMOUNTS[0];

  return (
    <section className="relative overflow-x-clip overflow-y-hidden bg-[#EAECEF] pt-6 sm:pt-10">
      {/* Drifting Ambient Studio Emerald Light Sweeps */}
      <motion.div
        aria-hidden="true"
        animate={
          prefersReduced
            ? undefined
            : { x: [-24, 24, -24], y: [-12, 14, -12], scale: [1, 1.05, 1] }
        }
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -inset-12 bg-[linear-gradient(128deg,transparent_22%,rgba(16,185,129,0.2)_48%,rgba(0,104,56,0.22)_66%,transparent_88%)]"
      />

      {/* Parallax Watermark Typography behind Cutout */}
      <motion.div
        aria-hidden="true"
        style={prefersReduced ? undefined : { x: watermarkX }}
        className="pointer-events-none absolute inset-x-0 bottom-20 flex select-none justify-center overflow-hidden sm:bottom-24"
      >
        <span className="whitespace-nowrap text-[5rem] font-black leading-none tracking-[-0.06em] text-[#006838]/[0.11] sm:text-[10.5rem] lg:text-[13.5rem]">
          nairabooks
        </span>
      </motion.div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid min-h-[560px] grid-cols-1 items-start gap-6 lg:min-h-[620px] lg:grid-cols-12 lg:items-stretch">
          {/* Top-Left Corner-Bracketed Metric + Living iOS Dynamic Island Pill */}
          <div className="order-2 flex flex-col items-start gap-4 lg:order-1 lg:col-span-3 lg:pt-6">
            <motion.div
              initial={prefersReduced ? false : { y: 14, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="relative inline-flex w-44 flex-col items-center rounded-t-[20px] border-x border-t border-[#1C1C1E]/18 bg-white/55 px-4 py-5 text-center backdrop-blur-md"
            >
              <div className="flex -space-x-2" aria-hidden="true">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#1C1C1E] font-mono text-[10px] font-semibold text-white">
                  ZB
                </span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#006838] font-mono text-[10px] font-semibold text-white">
                  GT
                </span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-white font-mono text-[10px] font-semibold text-[#1C1C1E]">
                  MP
                </span>
              </div>
              <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-[#1C1C1E]">
                0%
              </p>
              <p className="mt-1 text-xs leading-snug text-[#5E5E64]">
                Company tax under ₦100M (2025 Act)
              </p>
            </motion.div>

            {/* iOS Dynamic Island Live Activity Widget (Expanding Pill + Dancing Waveform) */}
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="flex w-full max-w-[260px] items-center gap-3 rounded-full bg-[#1C1C1E] px-3.5 py-2.5 text-white shadow-[0_16px_36px_-10px_rgba(0,0,0,0.35)]"
            >
              {/* Animated 4-bar iOS Live Activity Waveform */}
              <div className="flex h-5 items-end gap-[2.5px] px-1" aria-hidden="true">
                {[0.4, 1, 0.65, 0.9].map((base, idx) => (
                  <motion.span
                    key={idx}
                    animate={
                      prefersReduced
                        ? undefined
                        : {
                            height: ["35%", "100%", "45%", "85%", "35%"],
                          }
                    }
                    transition={{
                      duration: 1.15 + idx * 0.18,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: idx * 0.12,
                    }}
                    style={{ height: `${Math.round(base * 100)}%` }}
                    className="w-[3px] rounded-full bg-[#34D399]"
                  />
                ))}
              </div>

              <div className="min-w-0 flex-1 overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={currentAlert.id}
                    initial={prefersReduced ? false : { y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={prefersReduced ? undefined : { y: -12, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 340, damping: 26 }}
                    className="leading-tight"
                  >
                    <p className="truncate text-[11px] font-semibold text-white">
                      {currentAlert.app}
                    </p>
                    <p className="truncate font-mono text-[11px] text-[#34D399]">
                      {currentAlert.amount} · {currentAlert.detail}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          {/* Centerpiece Founder Cutout + Counter-Rotating Gyroscope CTA Orb */}
          <div className="relative order-3 flex items-end justify-center lg:order-2 lg:col-span-5">
            <motion.div
              style={prefersReduced ? undefined : { y: portraitY }}
              initial={prefersReduced ? false : { scale: 0.97, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
              className="relative mx-auto w-full max-w-[320px] sm:max-w-[430px]"
            >
              <div className="relative overflow-hidden">
                <img
                  src="/images/nairabooks-hero-founder.jpg"
                  alt="Confident Nigerian business owner holding a green NairaBooks card"
                  className="mx-auto block h-auto w-full object-cover object-top mix-blend-multiply [mask-image:radial-gradient(ellipse_78%_86%_at_50%_46%,black_62%,transparent_100%)]"
                />
              </div>

              {/* Dual Counter-Rotating Gyroscope Rings + Ripple Ping around Floating CTA */}
              <motion.div
                animate={prefersReduced ? undefined : { y: [0, -11, 0] }}
                transition={{
                  duration: 3.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute bottom-16 right-0 z-20 sm:bottom-28 sm:-right-4"
              >
                <div className="relative flex h-28 w-28 sm:h-40 sm:w-40 items-center justify-center">
                  {/* Expanding Pulsing Halo Ping */}
                  <motion.div
                    aria-hidden="true"
                    animate={
                      prefersReduced
                        ? undefined
                        : { scale: [0.85, 1.18], opacity: [0.55, 0] }
                    }
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    className="pointer-events-none absolute inset-2 sm:inset-3 rounded-full border-2 border-[#006838]/50"
                  />

                  {/* Outer Dashed Gyroscope Ring */}
                  <motion.svg
                    aria-hidden="true"
                    viewBox="0 0 160 160"
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    animate={prefersReduced ? undefined : { rotate: 360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  >
                    <circle
                      cx="80"
                      cy="80"
                      r="75"
                      fill="none"
                      stroke="#1C1C1E"
                      strokeOpacity="0.22"
                      strokeWidth="1.5"
                      strokeDasharray="6 6"
                    />
                  </motion.svg>

                  {/* Counter-Rotating Active Emerald Arc */}
                  <motion.svg
                    aria-hidden="true"
                    viewBox="0 0 160 160"
                    className="pointer-events-none absolute inset-1 sm:inset-1.5 h-[92%] w-[92%] sm:h-[148px] sm:w-[148px]"
                    animate={prefersReduced ? undefined : { rotate: -360 }}
                    transition={{ duration: 7.5, repeat: Infinity, ease: "linear" }}
                  >
                    <circle
                      cx="80"
                      cy="80"
                      r="68"
                      fill="none"
                      stroke="#006838"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="90 340"
                    />
                  </motion.svg>

                  <motion.div
                    whileHover={prefersReduced ? undefined : { scale: 1.07 }}
                    whileTap={prefersReduced ? undefined : { scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                    className="relative z-10 h-20 w-20 sm:h-32 sm:w-32 rounded-full"
                  >
                    <Link
                      href="/signup"
                      aria-label="Get Started Free"
                      className="group relative flex h-full w-full items-center justify-center rounded-full bg-white text-center shadow-[0_22px_50px_-10px_rgba(28,28,30,0.28),inset_0_1px_0_rgba(255,255,255,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006838]"
                    >
                      <span className="px-2 sm:px-4 text-[10px] sm:text-xs font-bold leading-tight tracking-[-0.015em] text-[#1C1C1E]">
                        Get started free
                      </span>
                      <span
                        aria-hidden="true"
                        className="absolute -right-0.5 top-0 sm:-right-1 sm:top-1 inline-flex h-6 w-6 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[#1C1C1E] text-white shadow-lg transition-transform duration-200 group-hover:rotate-90"
                      >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={2.5} />
                      </span>
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Top-Right Cupertino Display Headline */}
          <motion.div
            initial={prefersReduced ? false : { y: 14 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            className="order-1 space-y-4 lg:order-3 lg:col-span-4 lg:pt-6"
          >
            {/* Live Beacon Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#006838]/25 bg-white/90 px-3.5 py-1 text-xs font-semibold text-[#006838] shadow-sm backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#006838] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#006838]" />
              </span>
              <span>🇳🇬 Nigeria Tax Act 2025 · 0% CIT Ready</span>
            </div>

            <h1 className="text-3xl font-black leading-[1.08] tracking-[-0.035em] text-[#1C1C1E] sm:text-5xl lg:text-[3.25rem]">
              NairaBooks gives you{" "}
              <span className="relative inline-block bg-gradient-to-r from-[#006838] via-[#059669] to-[#C59B27] bg-clip-text text-transparent">
                total control
              </span>{" "}
              of your money
            </h1>

            <p className="max-w-sm text-[15px] leading-relaxed text-[#4A4A50] sm:text-base">
              Daily POS batches, Zenith &amp; GTBank transfers, and 7.5% VAT —{" "}
              <span className="font-semibold text-[#1C1C1E]">clear enough for any shop owner</span>,{" "}
              <span className="font-semibold text-[#006838]">structured for your accountant</span>.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <motion.div
                whileHover={prefersReduced ? undefined : { scale: 1.04 }}
                whileTap={prefersReduced ? undefined : { scale: 0.96 }}
              >
                <Link
                  href="/overview"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/80 bg-white/90 px-5 py-2 text-xs font-bold text-[#1C1C1E] shadow-sm backdrop-blur-xl transition hover:bg-white"
                >
                  <PlayCircle className="h-4 w-4 text-[#006838]" strokeWidth={2.2} aria-hidden="true" />
                  <span>Try Live Demo</span>
                </Link>
              </motion.div>
              <a
                href="#live-preview"
                className="inline-flex min-h-[44px] items-center gap-1.5 px-3 text-xs font-bold text-[#1C1C1E] underline-offset-4 hover:underline"
              >
                <span>See live workspace</span>
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
              </a>
            </div>

            {/* Micro Ticker Highlight */}
            <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-[#5E5E64]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#006838]" />
              <span>Universal multi-bank PDF parsing</span>
              <span aria-hidden="true">&middot;</span>
              <span className="font-bold text-[#006838]">Lagos WAT Live</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Grouped Transition + Overlapping Living Comet Sparkline Card */}
      <div className="relative bg-white pb-10">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-14 bg-[#EAECEF]"
        />

        <div className="relative z-20 mx-auto max-w-2xl px-4 sm:px-6">
          <motion.div
            whileHover={prefersReduced ? undefined : { y: -4 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
          >
            <Card className="border-[#E5E5EA] bg-white/95 p-6 shadow-[0_26px_64px_-18px_rgba(28,28,30,0.18)] backdrop-blur-xl sm:p-7">
              <div className="grid items-center gap-6 sm:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-2">
                  <h2 className="text-lg font-bold leading-snug tracking-[-0.02em] text-[#1C1C1E] sm:text-xl">
                    NairaBooks works for every way you get paid
                  </h2>
                  <p className="text-sm leading-relaxed text-[#5E5E64]">
                    POS settlements, bank transfers, and supplier bills sorted in
                    minutes with clear VAT set aside.
                  </p>
                </div>

                {/* Continuous Animated Emerald Comet Sparkline */}
                <div className="relative rounded-[16px] border border-[#E5E5EA] bg-[#F2F2F7]/85 p-3.5">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] text-[#5E5E64]">
                    <span className="font-medium">Daily net inflow</span>
                    <span className="inline-flex items-center gap-1 font-mono font-semibold text-[#006838]">
                      <TrendingUp className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />
                      Live
                    </span>
                  </div>
                  <svg
                    viewBox="0 0 220 74"
                    className="h-16 w-full overflow-visible"
                    role="img"
                    aria-label="Animated emerald cashflow trend showing daily inflows rising cleanly"
                  >
                    <defs>
                      <linearGradient id="nbSparkGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#34D399" />
                        <stop offset="55%" stopColor="#059669" />
                        <stop offset="100%" stopColor="#006838" />
                      </linearGradient>
                    </defs>
                    {/* Base Track */}
                    <path
                      d="M 4 56 C 32 54, 42 36, 70 40 C 98 44, 114 58, 142 34 C 166 14, 186 22, 214 14"
                      fill="none"
                      stroke="#D1FAE5"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 4 46 C 34 32, 54 62, 86 42 C 118 22, 134 52, 164 26 C 184 8, 198 18, 214 10"
                      fill="none"
                      stroke="url(#nbSparkGlow)"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                    {/* Continuously Traveling Light Packet along Wave */}
                    <motion.path
                      d="M 4 46 C 34 32, 54 62, 86 42 C 118 22, 134 52, 164 26 C 184 8, 198 18, 214 10"
                      fill="none"
                      stroke="#A7F3D0"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      strokeDasharray="24 220"
                      animate={
                        prefersReduced
                          ? undefined
                          : { strokeDashoffset: [244, 0] }
                      }
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                    <motion.circle
                      cx="214"
                      cy="10"
                      r="5"
                      fill="#006838"
                      animate={
                        prefersReduced
                          ? undefined
                          : { r: [4, 7.5, 4], opacity: [1, 0.45, 1] }
                      }
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </svg>

                  {/* Cycling Live Settlement Badge */}
                  <div className="absolute right-4 top-8">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={currentSparkAmount}
                        initial={prefersReduced ? false : { y: 8, opacity: 0, scale: 0.94 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={prefersReduced ? undefined : { y: -8, opacity: 0, scale: 0.94 }}
                        transition={{ type: "spring", stiffness: 360, damping: 24 }}
                        className="inline-flex items-center gap-1 rounded-full bg-[#1C1C1E] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-white shadow-md"
                      >
                        {currentSparkAmount}
                        <ArrowRight className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
