"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Coins, Landmark, Split } from "lucide-react";
import {
  AnimatedSection,
  RevealBlock,
  useSafeInView,
  useScrollChoreography,
} from "@/components/landing/SectionMotion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SplitPreset {
  readonly id: string;
  readonly label: string;
  readonly keepPct: number;
  readonly taxPct: number;
  readonly feePct: number;
  readonly sampleAmount: string;
  readonly keepAmount: string;
  readonly taxAmount: string;
  readonly feeAmount: string;
  readonly note: string;
}

const SPLIT_PRESETS: readonly [SplitPreset, ...SplitPreset[]] = [
  {
    id: "pos",
    label: "POS Sale",
    keepPct: 91,
    taxPct: 7,
    feePct: 2,
    sampleAmount: "₦100,000",
    keepAmount: "₦91,525",
    taxAmount: "₦6,975",
    feeAmount: "₦1,500",
    note: "Your shop keeps 91%, VAT goes into its own pot, and POS charges are logged.",
  },
  {
    id: "paystack",
    label: "Online Link",
    keepPct: 90,
    taxPct: 7,
    feePct: 3,
    sampleAmount: "₦100,000",
    keepAmount: "₦90,525",
    taxAmount: "₦6,975",
    feeAmount: "₦2,500",
    note: "Even when Paystack removes their fee first, your books still record the full sale.",
  },
  {
    id: "transfer",
    label: "Bank Transfer",
    keepPct: 93,
    taxPct: 7,
    feePct: 0,
    sampleAmount: "₦100,000",
    keepAmount: "₦93,023",
    taxAmount: "₦6,977",
    feeAmount: "₦0",
    note: "Direct bank alert matched with your Zenith, GTBank, Access, or UBA statement.",
  },
];

interface QuarterStat {
  readonly id: "Q1" | "Q2" | "Q3" | "Q4";
  readonly months: string;
  readonly salesHeightPct: number;
  readonly profitHeightPct: number;
  readonly salesIn: string;
  readonly billsPaid: string;
  readonly profitLeft: string;
  readonly summary: string;
}

const QUARTERS: readonly [QuarterStat, ...QuarterStat[]] = [
  {
    id: "Q1",
    months: "Jan – Mar",
    salesHeightPct: 62,
    profitHeightPct: 34,
    salesIn: "₦14,800,000",
    billsPaid: "₦9,200,000",
    profitLeft: "₦5,600,000",
    summary: "Strong Q1 supplier restock and steady daily walk-in sales.",
  },
  {
    id: "Q2",
    months: "Apr – Jun",
    salesHeightPct: 74,
    profitHeightPct: 44,
    salesIn: "₦18,450,000",
    billsPaid: "₦10,950,000",
    profitLeft: "₦7,500,000",
    summary: "Mid-year wholesale orders increased bank transfers cleanly.",
  },
  {
    id: "Q3",
    months: "Jul – Sep",
    salesHeightPct: 86,
    profitHeightPct: 52,
    salesIn: "₦22,100,000",
    billsPaid: "₦12,600,000",
    profitLeft: "₦9,500,000",
    summary: "Corporate invoicing boosted cashflow with 0% small-company CIT.",
  },
  {
    id: "Q4",
    months: "Oct – Dec",
    salesHeightPct: 98,
    profitHeightPct: 64,
    salesIn: "₦28,900,000",
    billsPaid: "₦15,400,000",
    profitLeft: "₦13,500,000",
    summary: "December peak season tracked daily without late-night spreadsheets.",
  },
];

const WALLET_CARDS = [
  {
    id: "zenith",
    title: "Zenith Bank Operating",
    subtitle: "Cleared payouts",
    amount: "₦4,820,400",
    colorClass: "bg-[#1C1C1E] text-white",
  },
  {
    id: "moniepoint",
    title: "Moniepoint POS Pot",
    subtitle: "Today's walk-in batch",
    amount: "₦413,700",
    colorClass: "bg-[#006838] text-white",
  },
  {
    id: "vat",
    title: "7.5% VAT Safe Pot",
    subtitle: "Protected from spending",
    amount: "₦318,950",
    colorClass: "bg-[#EAF3FC] text-[#0F4C81] border border-[#BFDBFE]",
  },
] as const;

export function CashflowStorySection() {
  const { canAnimate, prefersReduced } = useScrollChoreography();
  const [presetId, setPresetId] = useState("pos");
  const [quarterId, setQuarterId] = useState<QuarterStat["id"]>("Q1");
  const [frontWalletId, setFrontWalletId] = useState<string>("moniepoint");
  const walletRef = useRef<HTMLDivElement | null>(null);
  const splitRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);

  const walletInView = useSafeInView(walletRef, { amount: 0.25 });
  const splitInView = useSafeInView(splitRef, { amount: 0.25 });
  const chartInView = useSafeInView(chartRef, { amount: 0.25 });

  const activePreset =
    SPLIT_PRESETS.find((item) => item.id === presetId) ?? SPLIT_PRESETS[0];
  const activeQuarter =
    QUARTERS.find((item) => item.id === quarterId) ?? QUARTERS[0];

  const showSplitBars = !canAnimate || splitInView;
  const showQuarterBars = !canAnimate || chartInView;

  return (
    <AnimatedSection className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
        <RevealBlock className="max-w-xl space-y-2">
          <Badge variant="emerald">Day-to-Day Workflow</Badge>
          <h2 className="text-2xl font-bold tracking-[-0.025em] text-[#1C1C1E] sm:text-3xl">
            Every naira gets sorted the moment it arrives.
          </h2>
          <p className="text-sm leading-relaxed text-[#5E5E64] sm:text-base">
            No copying alerts into Excel at 11pm. Tap any Apple Wallet-style
            money pot or sale mode below to watch your numbers adjust live.
          </p>
        </RevealBlock>

        {/* Interactive Spring Fanning Apple Wallet Stack */}
        <div
          ref={walletRef}
          className="flex flex-wrap items-center gap-3"
          role="group"
          aria-label="Interactive NairaBooks money pots"
        >
          {WALLET_CARDS.map((card, idx) => {
            const isFront = card.id === frontWalletId;
            const stackedX = idx === 0 ? 36 : idx === 2 ? -36 : 0;
            return (
              <motion.button
                key={card.id}
                type="button"
                onClick={() => setFrontWalletId(card.id)}
                whileHover={prefersReduced ? undefined : { y: -6, rotate: 0, scale: 1.03 }}
                whileTap={prefersReduced ? undefined : { scale: 0.96 }}
                animate={
                  canAnimate
                    ? walletInView
                      ? {
                          x: 0,
                          opacity: 1,
                          y: isFront ? -6 : 0,
                          rotate: isFront ? 0 : idx === 0 ? -2.5 : 2.5,
                          scale: isFront ? 1.04 : 0.97,
                        }
                      : {
                          x: stackedX,
                          opacity: 0.25,
                          y: 26,
                          rotate: 0,
                          scale: 0.9,
                        }
                    : undefined
                }
                transition={{
                  type: "spring",
                  stiffness: 290,
                  damping: 22,
                  delay: canAnimate && walletInView ? idx * 0.08 : 0,
                }}
                aria-pressed={isFront}
                className={`min-w-[162px] rounded-[18px] p-4 text-left shadow-md ${card.colorClass}`}
              >
                <p className="text-[11px] font-medium opacity-80">{card.subtitle}</p>
                <p className="mt-0.5 text-xs font-semibold">{card.title}</p>
                <p className="mt-2 font-mono text-base font-bold tracking-tight">
                  {card.amount}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* Card 1: iOS Apple Cash Split Deck */}
        <RevealBlock delay={0.06} yOffset={36} xOffset={-18}>
          <motion.div
            ref={splitRef}
            whileHover={prefersReduced ? undefined : { y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#E6F5ED] text-[#006838]">
                  <Split className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
                </div>
                <div
                  className="inline-flex rounded-[12px] bg-[#E5E5EA]/90 p-1"
                  role="group"
                  aria-label="Payment channel examples"
                >
                  {SPLIT_PRESETS.map((preset) => {
                    const selected = preset.id === activePreset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setPresetId(preset.id)}
                        aria-pressed={selected}
                        className={`relative min-h-[34px] rounded-[9px] px-3 text-xs font-semibold transition-colors ${
                          selected
                            ? "text-[#1C1C1E]"
                            : "text-[#5E5E64] hover:text-[#1C1C1E]"
                        }`}
                      >
                        {selected && (
                          <motion.span
                            layoutId="cashflow-split-pill"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            className="absolute inset-0 rounded-[9px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                          />
                        )}
                        <span className="relative z-10">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <CardTitle className="text-lg tracking-[-0.02em] text-[#1C1C1E]">
                Watch one {activePreset.sampleAmount} sale split automatically
              </CardTitle>
              <CardDescription className="text-[#5E5E64]">
                {activePreset.note}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div
                  className="flex h-4 w-full overflow-hidden rounded-full bg-[#E5E5EA] p-0.5"
                  role="img"
                  aria-label={`Money split: ${activePreset.keepPct}% kept, ${activePreset.taxPct}% VAT, ${activePreset.feePct}% fee`}
                >
                  <motion.div
                    animate={{ width: showSplitBars ? `${activePreset.keepPct}%` : "0%" }}
                    transition={
                      prefersReduced
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 220, damping: 22 }
                    }
                    className="h-full rounded-full bg-[#006838]"
                  />
                  <motion.div
                    animate={{ width: showSplitBars ? `${activePreset.taxPct}%` : "0%" }}
                    transition={
                      prefersReduced
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 220, damping: 22, delay: 0.08 }
                    }
                    className="mx-0.5 h-full rounded-full bg-[#D97706]"
                  />
                  {activePreset.feePct > 0 && (
                    <motion.div
                      animate={{ width: showSplitBars ? `${activePreset.feePct}%` : "0%" }}
                      transition={
                        prefersReduced
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 220, damping: 22, delay: 0.14 }
                      }
                      className="h-full rounded-full bg-[#71717A]"
                    />
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-[14px] border border-[#E5E5EA] bg-[#F2F2F7]/75 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-[#5E5E64]">
                      <span className="h-2 w-2 rounded-full bg-[#006838]" />
                      You keep
                    </div>
                    <p className="mt-1 nb-money-cell text-left text-sm font-bold text-[#1C1C1E]">
                      {activePreset.keepAmount}
                    </p>
                  </div>

                  <div className="rounded-[14px] border border-[#E5E5EA] bg-[#F2F2F7]/75 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-[#5E5E64]">
                      <span className="h-2 w-2 rounded-full bg-[#D97706]" />
                      7.5% VAT pot
                    </div>
                    <p className="mt-1 nb-money-cell text-left text-sm font-bold text-[#1C1C1E]">
                      {activePreset.taxAmount}
                    </p>
                  </div>

                  <div className="rounded-[14px] border border-[#E5E5EA] bg-[#F2F2F7]/75 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-[#5E5E64]">
                      <span className="h-2 w-2 rounded-full bg-[#71717A]" />
                      Fee paid
                    </div>
                    <p className="mt-1 nb-money-cell text-left text-sm font-bold text-[#1C1C1E]">
                      {activePreset.feeAmount}
                    </p>
                  </div>
                </div>
              </div>

              <ul className="space-y-2 text-sm text-[#5E5E64]">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-[#006838]" strokeWidth={2.4} aria-hidden="true" />
                  Upload PDF statements from Zenith, GTBank, Access, or UBA
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-[#006838]" strokeWidth={2.4} aria-hidden="true" />
                  Never accidentally spend your VAT or customer tax money
                </li>
              </ul>
            </CardContent>
          </Card>
          </motion.div>
        </RevealBlock>

        {/* Card 2: iOS Spring Quarterly Profit Chart */}
        <RevealBlock delay={0.14} yOffset={36} xOffset={18}>
          <motion.div
            ref={chartRef}
            whileHover={prefersReduced ? undefined : { y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#EAF3FC] text-[#0F4C81]">
                  <Landmark className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
                </div>
                <Badge variant="iosBlue">Interactive Chart</Badge>
              </div>
              <CardTitle className="text-lg tracking-[-0.02em] text-[#1C1C1E]">
                Know if your business made profit each quarter
              </CardTitle>
              <CardDescription className="text-[#5E5E64]">
                Tap Q1, Q2, Q3, or Q4 below to compare sales against bills paid
                and profit left over.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-2 rounded-[16px] border border-[#E5E5EA] bg-[#F2F2F7]/75 p-3">
                {QUARTERS.map((q, qIndex) => {
                  const isSelected = q.id === activeQuarter.id;
                  return (
                    <motion.button
                      key={q.id}
                      type="button"
                      onClick={() => setQuarterId(q.id)}
                      aria-pressed={isSelected}
                      whileHover={prefersReduced ? undefined : { y: -3 }}
                      whileTap={prefersReduced ? undefined : { scale: 0.95 }}
                      className={`flex min-h-[138px] flex-col justify-end rounded-[12px] border p-2.5 text-left transition-all ${
                        isSelected
                          ? "border-[#1C1C1E] bg-white shadow-[0_4px_14px_rgba(0,0,0,0.09)]"
                          : "border-transparent hover:border-[#D1D1D6] hover:bg-white/70"
                      }`}
                    >
                      <div className="flex h-20 w-full items-end gap-1.5">
                        <motion.div
                          initial={false}
                          animate={{
                            scaleY: showQuarterBars ? (isSelected ? 1.06 : 1) : 0.14,
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 250,
                            damping: 18,
                            delay: showQuarterBars ? qIndex * 0.07 : 0,
                          }}
                          style={{
                            height: `${q.salesHeightPct}%`,
                            transformOrigin: "bottom",
                          }}
                          className="w-1/2 rounded-t-[6px] bg-[#1C1C1E]"
                        />
                        <motion.div
                          initial={false}
                          animate={{
                            scaleY: showQuarterBars ? (isSelected ? 1.08 : 1) : 0.14,
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 250,
                            damping: 18,
                            delay: showQuarterBars ? qIndex * 0.07 + 0.05 : 0,
                          }}
                          style={{
                            height: `${q.profitHeightPct}%`,
                            transformOrigin: "bottom",
                          }}
                          className="w-1/2 rounded-t-[6px] bg-[#006838]"
                        />
                      </div>
                      <div className="mt-2">
                        <p className="text-xs font-bold text-[#1C1C1E]">{q.id}</p>
                        <p className="text-[11px] text-[#5E5E64]">{q.months}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <motion.div
                key={activeQuarter.id}
                data-testid="cashflow-quarter-detail"
                initial={prefersReduced ? false : { y: 8, scale: 0.98 }}
                animate={{ y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 360, damping: 26 }}
                className="rounded-[16px] border border-[#E5E5EA] bg-white p-4"
              >
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs text-[#5E5E64]">Sales In</p>
                    <p className="nb-money-cell text-left text-sm font-bold text-[#1C1C1E]">
                      {activeQuarter.salesIn}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#5E5E64]">Bills Paid</p>
                    <p className="nb-money-cell text-left text-sm font-bold text-[#5E5E64]">
                      {activeQuarter.billsPaid}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#006838]">Profit Left</p>
                    <p className="nb-money-cell text-left text-sm font-bold text-[#006838]">
                      {activeQuarter.profitLeft}
                    </p>
                  </div>
                </div>
                <p className="mt-2.5 flex items-center gap-1.5 text-xs text-[#5E5E64]">
                  <Coins className="h-3.5 w-3.5 shrink-0 text-[#006838]" strokeWidth={2.2} aria-hidden="true" />
                  <span>{activeQuarter.summary}</span>
                </p>
              </motion.div>
            </CardContent>
          </Card>
          </motion.div>
        </RevealBlock>
      </div>
    </AnimatedSection>
  );
}
