"use client";

import React, { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  Lock,
  Percent,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export type ScenarioId = "shop" | "contractor" | "hotel";

interface LedgerLine {
  readonly id: string;
  readonly plainLabel: string;
  readonly accountCode: string;
  readonly direction: "in" | "out" | "tax";
  readonly side: "DR" | "CR";
  readonly amountNaira: number;
}

interface BusinessScenario {
  readonly id: ScenarioId;
  readonly label: string;
  readonly bankLabel: string;
  readonly summaryText: string;
  readonly grossNaira: number;
  readonly netCashNaira: number;
  readonly taxPotNaira: number;
  readonly feeLabel: string;
  readonly lines: readonly LedgerLine[];
  readonly receiptNumber: string;
  readonly customerName: string;
}

const SCENARIOS: readonly [BusinessScenario, ...BusinessScenario[]] = [
  {
    id: "shop",
    label: "Shop Sale",
    bankLabel: "Moniepoint POS -> Zenith Bank",
    summaryText: "18 walk-in POS & transfer sales closed today in Lagos.",
    grossNaira: 420000,
    netCashNaira: 413700,
    taxPotNaira: 29302.33,
    feeLabel: "POS charges: ₦6,300",
    receiptNumber: "NB-INV-4092",
    customerName: "Walk-in Shop Customers (POS Batch)",
    lines: [
      {
        id: "shop-bank",
        plainLabel: "Money landing in Zenith Bank",
        accountCode: "1120 Zenith Clearing",
        direction: "in",
        side: "DR",
        amountNaira: 413700,
      },
      {
        id: "shop-fee",
        plainLabel: "POS fee taken by Moniepoint",
        accountCode: "6210 Payment Fees",
        direction: "out",
        side: "DR",
        amountNaira: 6300,
      },
      {
        id: "shop-rev",
        plainLabel: "Your real shop earnings",
        accountCode: "4100 Retail Sales",
        direction: "in",
        side: "CR",
        amountNaira: 390697.67,
      },
      {
        id: "shop-vat",
        plainLabel: "7.5% VAT set aside safely",
        accountCode: "2130 VAT Payable",
        direction: "tax",
        side: "CR",
        amountNaira: 29302.33,
      },
    ],
  },
  {
    id: "contractor",
    label: "Abuja Invoice",
    bankLabel: "Corporate Transfer -> GTBank",
    summaryText: "Client paid milestone invoice after holding back 2% tax.",
    grossNaira: 2500000,
    netCashNaira: 2637500,
    taxPotNaira: 187500,
    feeLabel: "WHT tax credit saved: ₦50,000",
    receiptNumber: "NB-BILL-8814",
    customerName: "Federal Logistics & Works Abuja",
    lines: [
      {
        id: "con-bank",
        plainLabel: "Cash paid into GTBank",
        accountCode: "1120 GTBank Operating",
        direction: "in",
        side: "DR",
        amountNaira: 2637500,
      },
      {
        id: "con-wht",
        plainLabel: "Tax held back by client (WHT)",
        accountCode: "1125 WHT Tax Credit",
        direction: "tax",
        side: "DR",
        amountNaira: 50000,
      },
      {
        id: "con-rev",
        plainLabel: "Contract work earned",
        accountCode: "4100 Project Income",
        direction: "in",
        side: "CR",
        amountNaira: 2500000,
      },
      {
        id: "con-vat",
        plainLabel: "7.5% VAT included on invoice",
        accountCode: "2130 VAT Payable",
        direction: "tax",
        side: "CR",
        amountNaira: 187500,
      },
    ],
  },
  {
    id: "hotel",
    label: "Hotel & Diner",
    bankLabel: "Paystack + Room Bookings -> Access Bank",
    summaryText: "Room stays and restaurant meals recorded under one roof.",
    grossNaira: 1150000,
    netCashNaira: 1132750,
    taxPotNaira: 80232.56,
    feeLabel: "Rooms + Kitchen tracked together",
    receiptNumber: "NB-STAY-2219",
    customerName: "Weekend Room Stays & Kitchen Bills",
    lines: [
      {
        id: "htl-bank",
        plainLabel: "Cash cleared into Access Bank",
        accountCode: "1120 Access Bank Main",
        direction: "in",
        side: "DR",
        amountNaira: 1132750,
      },
      {
        id: "htl-fee",
        plainLabel: "Card & Paystack processing",
        accountCode: "6210 Gateway Charges",
        direction: "out",
        side: "DR",
        amountNaira: 17250,
      },
      {
        id: "htl-rooms",
        plainLabel: "Room stays & diner food earned",
        accountCode: "4200 Rooms & Kitchen",
        direction: "in",
        side: "CR",
        amountNaira: 1069767.44,
      },
      {
        id: "htl-vat",
        plainLabel: "7.5% VAT set aside",
        accountCode: "2130 VAT Payable",
        direction: "tax",
        side: "CR",
        amountNaira: 80232.56,
      },
    ],
  },
];

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function AnimatedNairaNumber({ value }: { readonly value: number }) {
  const prefersReduced = useReducedMotion();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(value);
      return;
    }

    const startValue = display;
    const diff = value - startValue;
    if (Math.abs(diff) < 1) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const totalFrames = 22;
    let rafId = 0;

    const step = () => {
      frame += 1;
      const progress = 1 - Math.pow(1 - frame / totalFrames, 3);
      setDisplay(startValue + diff * progress);
      if (frame < totalFrames) {
        rafId = window.requestAnimationFrame(step);
      } else {
        setDisplay(value);
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, prefersReduced]);

  return <span>{formatNaira(display)}</span>;
}

export function ProductPreviewWindow() {
  const prefersReduced = useReducedMotion();
  const [scenarioId, setScenarioId] = useState<ScenarioId>("shop");
  const [accountantMode, setAccountantMode] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [4.5, -4.5]), {
    stiffness: 180,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5.0, 5.0]), {
    stiffness: 180,
    damping: 22,
  });

  const activeScenario =
    SCENARIOS.find((item) => item.id === scenarioId) ?? SCENARIOS[0];

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReduced) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    mouseX.set((event.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const resetPointer = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      className="relative"
      style={{ perspective: 1200 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      {/* Layered Depth Stack Cards behind Window */}
      <motion.div
        aria-hidden="true"
        animate={prefersReduced ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -inset-x-4 -bottom-4 top-6 rounded-[28px] border border-[#E5E5EA] bg-[#F2F2F7]/80"
      />

      <motion.div
        style={
          prefersReduced
            ? undefined
            : { rotateX, rotateY, transformStyle: "preserve-3d" }
        }
      >
        <Card
          data-testid="product-preview-window"
          className="relative overflow-hidden border-[#E5E5EA] bg-white shadow-[0_28px_70px_-20px_rgba(28,28,30,0.18)]"
        >
          {/* Apple iPadOS / macOS Toolbar Header */}
          <CardHeader className="space-y-4 border-b border-[#E5E5EA] bg-[#F8F8FA] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#006838] text-white shadow-sm">
                  <Wallet className="h-5 w-5" strokeWidth={2.1} aria-hidden="true" />
                  <motion.span
                    aria-hidden="true"
                    animate={
                      prefersReduced
                        ? undefined
                        : { scale: [1, 1.8, 1], opacity: [0.9, 0, 0.9] }
                    }
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                    className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#34D399]"
                  />
                  <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-[#10B981]" />
                </div>
                <div>
                  <CardTitle className="text-[15px] font-semibold tracking-[-0.02em] text-[#1C1C1E]">
                    Live Books · Ikeja &amp; Wuse
                  </CardTitle>
                  <CardDescription className="text-xs text-[#5E5E64]">
                    Tilt cursor across card, switch shops, or view accounting lines
                  </CardDescription>
                </div>
              </div>

              {/* Apple UISegmentedControl Switcher */}
              <div
                className="inline-flex items-center rounded-[12px] bg-[#E5E5EA]/90 p-1"
                role="group"
                aria-label="Preview view style"
              >
                <button
                  type="button"
                  onClick={() => setAccountantMode(false)}
                  aria-pressed={!accountantMode}
                  className={`relative min-h-[36px] rounded-[9px] px-3 text-xs font-semibold transition-colors ${
                    !accountantMode
                      ? "text-[#1C1C1E]"
                      : "text-[#5E5E64] hover:text-[#1C1C1E]"
                  }`}
                >
                  {!accountantMode && (
                    <motion.span
                      layoutId="preview-mode-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="absolute inset-0 rounded-[9px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                    Plain English
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountantMode(true)}
                  aria-pressed={accountantMode}
                  className={`relative min-h-[36px] rounded-[9px] px-3 text-xs font-semibold transition-colors ${
                    accountantMode
                      ? "text-[#1C1C1E]"
                      : "text-[#5E5E64] hover:text-[#1C1C1E]"
                  }`}
                >
                  {accountantMode && (
                    <motion.span
                      layoutId="preview-mode-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="absolute inset-0 rounded-[9px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                    Accountant View
                  </span>
                </button>
              </div>
            </div>

            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Try a Nigerian business example"
            >
              {SCENARIOS.map((item) => {
                const isActive = item.id === activeScenario.id;
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    whileTap={prefersReduced ? undefined : { scale: 0.95 }}
                    onClick={() => setScenarioId(item.id)}
                    aria-pressed={isActive}
                    className={`relative min-h-[38px] rounded-full px-4 text-xs font-semibold transition-colors ${
                      isActive
                        ? "text-white"
                        : "border border-[#D1D1D6] bg-white text-[#5E5E64] hover:text-[#1C1C1E]"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="scenario-pill"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="absolute inset-0 rounded-full bg-[#1C1C1E]"
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-5">
            {/* iOS Wallet Summary Tile */}
            <div className="rounded-[18px] border border-[#E5E5EA] bg-[#F2F2F7]/75 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-[#5E5E64]">
                    {activeScenario.bankLabel}
                  </p>
                  <p className="mt-1 nb-money-cell text-left text-2xl font-bold tracking-tight text-[#1C1C1E] sm:text-3xl">
                    <AnimatedNairaNumber value={activeScenario.netCashNaira} />
                  </p>
                </div>
                <Badge variant="emerald">
                  <CheckCircle2 className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />
                  Balanced
                </Badge>
              </div>
              <p className="mt-2 text-xs text-[#5E5E64]">
                {activeScenario.summaryText} ·{" "}
                <span className="font-semibold text-[#1C1C1E]">
                  {activeScenario.feeLabel}
                </span>
              </p>
            </div>

            {/* iOS InsetGrouped Transaction List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 text-xs font-semibold text-[#5E5E64]">
                <span>
                  {accountantMode ? "Journal Lines" : "Where the money went"}
                </span>
                <span className="font-mono">Amount (₦)</span>
              </div>

              <ul className="divide-y divide-[#E5E5EA] overflow-hidden rounded-[18px] border border-[#E5E5EA] bg-white">
                {activeScenario.lines.map((line, index) => (
                  <motion.li
                    key={`${activeScenario.id}-${accountantMode ? "acc" : "plain"}-${line.id}`}
                    initial={prefersReduced ? false : { x: -10, scale: 0.98 }}
                    animate={{ x: 0, scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 360,
                      damping: 26,
                      delay: prefersReduced ? 0 : index * 0.05,
                    }}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${
                          line.direction === "in"
                            ? "bg-[#E6F5ED] text-[#006838]"
                            : line.direction === "tax"
                              ? "bg-[#FEF9E6] text-[#784507]"
                              : "bg-[#E5E5EA] text-[#1C1C1E]"
                        }`}
                      >
                        {accountantMode ? (
                          <span className="font-mono text-[11px] font-bold">
                            {line.side}
                          </span>
                        ) : line.direction === "in" ? (
                          <ArrowDownLeft className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                        ) : line.direction === "tax" ? (
                          <Percent className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                        ) : (
                          <Building2 className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#1C1C1E]">
                          {accountantMode
                            ? `${line.side} ${line.accountCode}`
                            : line.plainLabel}
                        </p>
                        {accountantMode && (
                          <p className="truncate text-xs text-[#5E5E64]">
                            {line.plainLabel}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="nb-money-cell shrink-0 text-sm font-semibold text-[#1C1C1E]">
                      {formatNaira(line.amountNaira)}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </CardContent>

          <Separator className="bg-[#E5E5EA]" />

          <CardFooter className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
            <div className="flex items-center gap-2 text-xs text-[#5E5E64]">
              <Building2 className="h-3.5 w-3.5 text-[#006838]" strokeWidth={2.2} aria-hidden="true" />
              <span>Nigeria Tax Act 2025 ready</span>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <ReceiptText className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                  See Sample Receipt
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[24px] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-[#1C1C1E]">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#E6F5ED] text-[#006838]">
                      <Lock className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                    </span>
                    Saved Receipt Record
                  </DialogTitle>
                  <DialogDescription className="text-[#5E5E64]">
                    Every entry keeps a clear record showing who entered it, the
                    date, and the tax set aside.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 rounded-[18px] border border-[#E5E5EA] bg-[#F2F2F7]/75 p-4 text-sm">
                  <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2">
                    <span className="text-[#5E5E64]">Receipt Number</span>
                    <span className="font-mono font-semibold text-[#1C1C1E]">
                      {activeScenario.receiptNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2">
                    <span className="text-[#5E5E64]">Customer / Batch</span>
                    <span className="font-semibold text-[#1C1C1E]">
                      {activeScenario.customerName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2">
                    <span className="text-[#5E5E64]">Total Received</span>
                    <span className="nb-money-cell font-semibold text-[#1C1C1E]">
                      {formatNaira(activeScenario.netCashNaira)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5E5E64]">7.5% VAT Pot</span>
                    <span className="nb-money-cell font-semibold text-[#006838]">
                      {formatNaira(activeScenario.taxPotNaira)}
                    </span>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Close
                    </Button>
                  </DialogClose>
                  <Button type="button" variant="emerald" asChild>
                    <a href="/books/journal">
                      Open Full Journal
                      <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                    </a>
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
