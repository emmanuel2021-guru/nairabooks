"use client";

import React, { useEffect, useState } from "react";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import {
  Banknote,
  Landmark,
  Receipt,
  Scale,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface LoaderSceneMeta {
  readonly id: "naira-mint" | "ledger-scale" | "pos-ticket" | "apple-wallet" | "tax-shield";
  readonly badge: string;
  readonly title: string;
  readonly quips: readonly [string, string, string];
}

export const LOADER_SCENES: readonly [LoaderSceneMeta, ...LoaderSceneMeta[]] = [
  {
    id: "naira-mint",
    badge: "Mint Engine",
    title: "Benin Royal Bronze Sun Medallion & Naira Mint...",
    quips: [
      "Counting every kobo with the precision of Benin bronze masters.",
      "Separating your 7.5% VAT pot before anyone can spend it.",
      "Spinning up Zenith, GTBank & Moniepoint live feeds.",
    ],
  },
  {
    id: "ledger-scale",
    badge: "Double-Entry Scale",
    title: "Balancing Debits = Credits on the scales of integrity...",
    quips: [
      "Putting Debits on the left and Credits on the right.",
      "Locking CAMA 2020 tamper-proof seals across every voucher.",
      "Translating accountant jargon into plain everyday English.",
    ],
  },
  {
    id: "pos-ticket",
    badge: "POS & Bank Sync",
    title: "Lagos Commerce & POS settlement rails...",
    quips: [
      "Catching Moniepoint, OPay & Paystack card fees automatically.",
      "Matching bank transfer alerts faster than your morning coffee.",
      "Checking every Lagos & Abuja vendor TIN before WHT deductions.",
    ],
  },
  {
    id: "apple-wallet",
    badge: "Cupertino Vault",
    title: "Stacking your money pots with Adire precision...",
    quips: [
      "Fanning your Zenith, Moniepoint & VAT safe pots into view.",
      "Polishing the frosted glass on your CFO command center.",
      "Sorting Q1–Q4 cashflow without a single Excel crash.",
    ],
  },
  {
    id: "tax-shield",
    badge: "Tax Act 2025",
    title: "Deploying the Nigeria Tax Act 2025 compliance shield...",
    quips: [
      "Checking 0% Small Company CIT eligibility under the 2025 law.",
      "Lining up FRCN statements so auditors smile at first glance.",
      "Preparing live figures — almost at the runway.",
    ],
  },
];

const LAST_LOADER_KEY = "nb_last_loader_scene_idx";

function pickNextSceneIndex(): number {
  if (typeof window === "undefined") return 0;
  try {
    const rawLast = window.sessionStorage.getItem(LAST_LOADER_KEY);
    const lastIdx = rawLast !== null ? Number.parseInt(rawLast, 10) : -1;
    const candidates = LOADER_SCENES.map((_, idx) => idx).filter((i) => i !== lastIdx);
    const randomPick =
      candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
    window.sessionStorage.setItem(LAST_LOADER_KEY, String(randomPick));
    return randomPick;
  } catch {
    return Date.now() % LOADER_SCENES.length;
  }
}

/** 1. Benin Royal Bronze Sun Medallion & 3D Naira Coin */
function SceneNairaMint({ reduced }: { readonly reduced: boolean }) {
  const orbiting = [Banknote, Landmark, Receipt, ShieldCheck] as const;
  return (
    <div className="relative flex h-48 w-full items-center justify-center">
      {/* Outer Rotating Benin Bronze Sun Medallion */}
      <motion.svg
        viewBox="0 0 200 200"
        className="absolute h-48 w-48"
        aria-hidden="true"
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="100" cy="100" r="92" fill="none" stroke="#C59B27" strokeOpacity="0.45" strokeWidth="2" strokeDasharray="6 4" />
        <circle cx="100" cy="100" r="78" fill="none" stroke="#006838" strokeOpacity="0.35" strokeWidth="2.5" />
        {/* 12 Traditional Radiating Bronze Sun Flutes */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
          <line
            key={deg}
            x1="100"
            y1="100"
            x2="100"
            y2="14"
            stroke="#C59B27"
            strokeOpacity="0.6"
            strokeWidth="2"
            transform={`rotate(${deg} 100 100)`}
          />
        ))}
      </motion.svg>

      {/* Counter-rotating Adire Eleko Diamond & Cowrie Constellation */}
      <motion.svg
        viewBox="0 0 160 160"
        className="absolute h-36 w-36"
        aria-hidden="true"
        animate={reduced ? undefined : { rotate: -360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      >
        <polygon points="80,12 148,80 80,148 12,80" fill="none" stroke="#006838" strokeOpacity="0.55" strokeWidth="2" />
        <polygon points="80,26 134,80 80,134 26,80" fill="none" stroke="#C59B27" strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="4 3" />
        <circle cx="80" cy="20" r="4.5" fill="#006838" fillOpacity="0.7" />
        <circle cx="140" cy="80" r="4.5" fill="#006838" fillOpacity="0.7" />
        <circle cx="80" cy="140" r="4.5" fill="#006838" fillOpacity="0.7" />
        <circle cx="20" cy="80" r="4.5" fill="#006838" fillOpacity="0.7" />
      </motion.svg>

      {/* Orbiting financial badges */}
      <motion.div
        aria-hidden="true"
        className="absolute h-40 w-40"
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 11, repeat: Infinity, ease: "linear" }}
      >
        {orbiting.map((Icon, idx) => {
          const angleDeg = idx * 90;
          return (
            <div
              key={idx}
              style={{
                transform: `rotate(${angleDeg}deg) translateY(-74px) rotate(-${angleDeg}deg)`,
              }}
              className="absolute left-1/2 top-1/2 -ml-4 -mt-4 flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#C59B27]/40 bg-white text-[#006838] shadow-sm"
            >
              <Icon className="h-4 w-4" strokeWidth={2.2} />
            </div>
          );
        })}
      </motion.div>

      {/* 3D Flipping Center Nigerian Naira Mint Coin with Gold Rim */}
      <motion.div
        animate={
          reduced
            ? undefined
            : {
                rotateY: [0, 180, 360],
                y: [0, -8, 0],
                scale: [1, 1.08, 1],
              }
        }
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#FDE68A] bg-gradient-to-br from-[#006838] via-[#047857] to-[#0B2545] font-mono text-3xl font-black text-amber-300 shadow-[0_16px_36px_rgba(0,104,56,0.45)]"
      >
        <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">₦</span>
      </motion.div>
    </div>
  );
}

/** 2. Traditional Cast Nigerian Bronze Scales of Balance */
function SceneLedgerScale({ reduced }: { readonly reduced: boolean }) {
  return (
    <div className="relative flex h-48 w-full flex-col items-center justify-center">
      {/* Seesaw Balance Beam with Traditional Chevron Carvings */}
      <motion.div
        animate={reduced ? undefined : { rotate: [-10, 10, -4, 0, -10] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        className="relative flex w-60 items-center justify-between"
      >
        {/* Debit Left Pan */}
        <motion.div
          animate={reduced ? undefined : { y: [0, -6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-1 rounded-[14px] border border-[#006838]/40 bg-[#E6F5ED] px-3.5 py-2 shadow-md"
        >
          <span className="font-mono text-[10px] font-black tracking-wider text-[#00582E]">DEBIT (₦)</span>
          <div className="flex gap-1 text-[9px] text-[#006838]">
            <span>Asset</span>
            <span>·</span>
            <span>Expense</span>
          </div>
        </motion.div>

        {/* Central Bronze Fulcrum Pivot with Benin Relief */}
        <div className="relative flex flex-col items-center">
          <div className="h-3 w-16 rounded-full bg-gradient-to-r from-[#8A5A2B] via-[#C59B27] to-[#8A5A2B] shadow-sm" />
          <div className="h-9 w-2 rounded-b-md bg-[#8A5A2B]" />
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#C59B27] bg-[#006838] text-white shadow-sm">
            <Scale className="h-4 w-4" strokeWidth={2.4} />
          </div>
        </div>

        {/* Credit Right Pan */}
        <motion.div
          animate={reduced ? undefined : { y: [-6, 0, -6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-1 rounded-[14px] border border-[#8A5A2B]/40 bg-[#FFFBEB] px-3.5 py-2 shadow-md"
        >
          <span className="font-mono text-[10px] font-black tracking-wider text-[#92400E]">CREDIT (₦)</span>
          <div className="flex gap-1 text-[9px] text-[#B45309]">
            <span>Income</span>
            <span>·</span>
            <span>Equity</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Base Pedestal and CAMA 2020 Equilibrium Badge */}
      <div className="mt-2 h-2 w-28 rounded-full bg-[#8A5A2B]/40" />
      <motion.div
        animate={reduced ? undefined : { scale: [0.96, 1.04, 0.96] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="mt-4 flex items-center gap-1.5 rounded-full border border-[#006838]/30 bg-[#E6F5ED] px-4 py-1 font-mono text-[11px] font-bold text-[#00582E]"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#006838]" />
        <span>DEBITS == CREDITS · CAMA 2020 SEAL</span>
      </motion.div>
    </div>
  );
}

/** 3. Lagos Commerce & Smart POS Settlement */
function ScenePosPrinter({ reduced }: { readonly reduced: boolean }) {
  return (
    <div className="relative flex h-48 w-full flex-col items-center justify-center">
      {/* Pulsing NFC Radio Waves */}
      <div className="relative flex items-center justify-center">
        {!reduced && (
          <motion.span
            aria-hidden="true"
            animate={{ scale: [0.9, 1.6], opacity: [0.7, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            className="absolute h-24 w-24 rounded-full border-2 border-[#006838]/50"
          />
        )}
        <div className="relative z-10 flex items-center gap-3 rounded-[22px] border border-[#006838]/30 bg-[#1C1C1E] px-5 py-3.5 text-white shadow-xl">
          <Smartphone className="h-5 w-5 text-[#34D399]" aria-hidden="true" />
          <div className="text-left">
            <p className="font-mono text-[10px] font-semibold text-[#A1A1AA]">MONIEPOINT / PAYSTACK</p>
            <p className="font-mono text-sm font-bold text-white">+₦285,000.00 SETTLED</p>
          </div>
        </div>
      </div>

      {/* Animated Printing Ticket with VAT & Nigerian Tax Pot */}
      <motion.div
        animate={reduced ? undefined : { y: [-3, 4, -3] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        className="-mt-1 w-52 space-y-1.5 rounded-b-[18px] border border-t-0 border-[#E5E5EA] bg-white px-4 py-3 shadow-md"
      >
        <div className="flex items-center justify-between font-mono text-[10px] text-[#5E5E64]">
          <span>7.5% VAT TAX POT</span>
          <span className="font-bold text-[#006838]">₦19,883.72</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F2F2F7]">
          <motion.div
            animate={reduced ? undefined : { x: ["-100%", "100%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#006838] to-[#10B981]"
          />
        </div>
        <p className="text-[9px] font-mono text-slate-400 text-center">RC-1849204 · Lagos Live VAT Feed</p>
      </motion.div>
    </div>
  );
}

/** 4. Nigerian Enterprise Vault with Adire Textures */
function SceneAppleWallet({ reduced }: { readonly reduced: boolean }) {
  const miniCards = [
    { label: "Zenith Bank Operating", amt: "₦48.25M", cls: "bg-[#1C1C1E] text-white border border-[#333]", restY: 16, restRot: -8, restX: -32 },
    { label: "Moniepoint POS Master", amt: "₦12.48M", cls: "bg-[#006838] text-white border border-emerald-400/30", restY: 0, restRot: 0, restX: 0 },
    { label: "7.5% VAT Tax Pot", amt: "₦3.61M", cls: "bg-[#FFFBEB] text-[#92400E] border border-amber-300", restY: 16, restRot: 8, restX: 32 },
  ] as const;

  return (
    <div className="relative flex h-48 w-full items-center justify-center">
      {miniCards.map((c, idx) => (
        <motion.div
          key={c.label}
          animate={
            reduced
              ? { x: c.restX, y: c.restY, rotate: c.restRot }
              : {
                  x: [c.restX * 0.4, c.restX * 1.25, c.restX * 0.4],
                  y: [c.restY, c.restY - 14, c.restY],
                  rotate: [c.restRot * 0.3, c.restRot * 1.4, c.restRot * 0.3],
                }
          }
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: idx * 0.16,
          }}
          className={`absolute flex h-26 w-36 flex-col justify-between rounded-[18px] p-3.5 shadow-lg ${c.cls}`}
          style={{ zIndex: idx === 1 ? 20 : 10 }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold opacity-90">{c.label}</p>
            <span className="font-mono text-[9px] font-black">🇳🇬</span>
          </div>
          <p className="font-mono text-base font-black tracking-tight">{c.amt}</p>
        </motion.div>
      ))}
    </div>
  );
}

/** 5. Nigeria Tax Act 2025 Statutory Shield */
function SceneTaxRocket({ reduced }: { readonly reduced: boolean }) {
  return (
    <div className="relative flex h-48 w-full items-center justify-center">
      <motion.svg
        viewBox="0 0 180 180"
        className="h-48 w-48"
        aria-hidden="true"
        animate={reduced ? undefined : { rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="90" cy="90" r="72" fill="none" stroke="#006838" strokeOpacity="0.3" strokeWidth="2.5" strokeDasharray="14 10" />
        <circle cx="90" cy="90" r="58" fill="none" stroke="#C59B27" strokeOpacity="0.4" strokeWidth="1.8" />
      </motion.svg>

      <motion.div
        animate={
          reduced
            ? undefined
            : { y: [4, -8, 4], rotate: [-3, 3, -3] }
        }
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute flex flex-col items-center"
      >
        <div className="flex h-18 w-18 items-center justify-center rounded-[24px] border-2 border-amber-300 bg-gradient-to-br from-[#006838] via-[#047857] to-[#8A5A2B] text-white shadow-xl">
          <ShieldCheck className="h-9 w-9 text-amber-300" strokeWidth={2.4} aria-hidden="true" />
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-[#E6F5ED] px-3.5 py-1 font-mono text-[11px] font-bold text-[#00582E] shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
          <span>0% SMALL BIZ CIT LOCKED</span>
        </div>
      </motion.div>
    </div>
  );
}

export function NairaBooksLoader({
  heading,
  compact = false,
}: {
  readonly heading?: string;
  readonly compact?: boolean;
}) {
  const prefersReduced = useReducedMotion();
  const [sceneIdx, setSceneIdx] = useState(0);
  const [quipIdx, setQuipIdx] = useState(0);

  useEffect(() => {
    setSceneIdx(pickNextSceneIndex());
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuipIdx((prev) => (prev + 1) % 3);
    }, 2200);
    return () => window.clearInterval(timer);
  }, []);

  const currentScene = LOADER_SCENES[sceneIdx] ?? LOADER_SCENES[0];
  const currentQuip = currentScene.quips[quipIdx] ?? currentScene.quips[0];

  return (
    <MotionConfig reducedMotion="user">
      <div
        role="status"
        aria-live="polite"
        className={`relative flex w-full flex-col items-center justify-center overflow-hidden text-center ${
          compact ? "py-4" : "min-h-screen w-full bg-[#F2F2F7] px-6 py-12"
        }`}
      >
        {!compact && (
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden select-none">
            {/* Top ambient emerald aura */}
            <div className="absolute left-1/2 top-[-10%] h-[480px] w-[580px] -translate-x-1/2 rounded-full bg-[#006838]/[0.12] blur-3xl" />
            {/* Warm gold ambient aura */}
            <div className="absolute bottom-[-10%] right-[10%] h-[380px] w-[460px] rounded-full bg-[#C59B27]/[0.1] blur-3xl" />
          </div>
        )}

        <div
          className={`relative z-10 flex w-full flex-col items-center ${
            compact ? "max-w-md" : "max-w-xl"
          }`}
        >
          <Badge variant="emerald" className="border border-[#006838]/30 shadow-sm">
            {currentScene.badge}
          </Badge>

          {/* Spacious Dynamic Animation Stage */}
          <div
            className={`mt-5 w-full overflow-hidden border border-[#E5E5EA] bg-white/95 shadow-[0_24px_60px_rgba(28,28,30,0.09)] backdrop-blur-xl ${
              compact ? "rounded-[24px] p-4" : "rounded-[32px] px-6 py-10 sm:py-12"
            }`}
          >
            <motion.div
              key={currentScene.id}
              initial={prefersReduced ? false : { scale: 0.92, y: 12 }}
              animate={{ scale: compact ? 1 : 1.12, y: 0 }}
              transition={{ type: "spring", stiffness: 290, damping: 24 }}
            >
              {currentScene.id === "naira-mint" && (
                <SceneNairaMint reduced={Boolean(prefersReduced)} />
              )}
              {currentScene.id === "ledger-scale" && (
                <SceneLedgerScale reduced={Boolean(prefersReduced)} />
              )}
              {currentScene.id === "pos-ticket" && (
                <ScenePosPrinter reduced={Boolean(prefersReduced)} />
              )}
              {currentScene.id === "apple-wallet" && (
                <SceneAppleWallet reduced={Boolean(prefersReduced)} />
              )}
              {currentScene.id === "tax-shield" && (
                <SceneTaxRocket reduced={Boolean(prefersReduced)} />
              )}
            </motion.div>
          </div>

          <div className={`space-y-2 ${compact ? "mt-4" : "mt-7"}`}>
            <p
              className={`font-black tracking-[-0.03em] text-[#1C1C1E] ${
                compact ? "text-lg" : "text-2xl sm:text-3xl"
              }`}
            >
              {heading ?? currentScene.title}
            </p>
            <p
              className={`mx-auto max-w-md leading-relaxed text-[#5E5E64] ${
                compact ? "min-h-[36px] text-xs sm:text-sm" : "min-h-[44px] text-sm sm:text-base"
              }`}
            >
              {currentQuip}
            </p>
          </div>

          {/* Continuous Shimmer Track */}
          <div
            aria-hidden="true"
            className={`w-full overflow-hidden rounded-full bg-[#E5E5EA] ${
              compact ? "mt-4 h-1.5" : "mt-6 h-2 max-w-sm"
            }`}
          >
            <motion.div
              animate={prefersReduced ? undefined : { x: ["-55%", "110%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#006838] via-[#10B981] to-[#C59B27]"
            />
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
