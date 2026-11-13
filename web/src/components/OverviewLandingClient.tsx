"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Check,
  FileWarning,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkspaceMode } from "@/state/workspace-mode";
import { NairaSign, renderWithNairaSign } from "@/components/ui/NairaAmount";
import type { AuthUserSummary } from "@/types/auth";

export type OverviewTimeframeId = "month" | "quarter" | "ytd";

interface CashflowBarPoint {
  readonly label: string;
  readonly inflowPct: number;
  readonly outflowPct: number;
  readonly inflowNgn: string;
  readonly outflowNgn: string;
  readonly isCurrent?: boolean;
}

interface ExpenseCategoryItem {
  readonly id: string;
  readonly label: string;
  readonly proCode: string;
  readonly amountNgn: string;
  readonly sharePct: number;
  readonly barClass: string;
}

interface TimeframeSnapshot {
  readonly id: OverviewTimeframeId;
  readonly label: string;
  readonly rangeNote: string;
  readonly netIncomeNgn: string;
  readonly netIncomeDelta: string;
  readonly cashFlowBars: readonly CashflowBarPoint[];
  readonly cashFlowSummary: string;
  readonly topExpenses: readonly ExpenseCategoryItem[];
  readonly unreconciledCount: number;
}

const TIMEFRAME_DATA: Record<OverviewTimeframeId, TimeframeSnapshot> = {
  month: {
    id: "month",
    label: "This Month",
    rangeNote: "October 2026 · Current cycle",
    netIncomeNgn: "6,940,000.00",
    netIncomeDelta: "+14.2%",
    cashFlowSummary: "Trailing 6 months (May – Oct) · Net +₦13.50M this month",
    cashFlowBars: [
      { label: "May", inflowPct: 62, outflowPct: 48, inflowNgn: "₦18.4M", outflowNgn: "₦14.1M" },
      { label: "Jun", inflowPct: 70, outflowPct: 52, inflowNgn: "₦21.2M", outflowNgn: "₦15.6M" },
      { label: "Jul", inflowPct: 78, outflowPct: 58, inflowNgn: "₦23.9M", outflowNgn: "₦17.2M" },
      { label: "Aug", inflowPct: 68, outflowPct: 45, inflowNgn: "₦20.5M", outflowNgn: "₦13.4M" },
      { label: "Sep", inflowPct: 86, outflowPct: 60, inflowNgn: "₦26.1M", outflowNgn: "₦18.0M" },
      { label: "Oct", inflowPct: 92, outflowPct: 50, inflowNgn: "₦28.4M", outflowNgn: "₦14.9M", isCurrent: true },
    ],
    topExpenses: [
      { id: "payroll", label: "Payroll & PAYE", proCode: "6110 Staff Salaries", amountNgn: "₦5,420,000", sharePct: 36, barClass: "bg-[#006838]" },
      { id: "inventory", label: "Stock & Purchases", proCode: "5100 Cost of Goods", amountNgn: "₦4,180,000", sharePct: 28, barClass: "bg-[#0F4C81]" },
      { id: "power", label: "Power, Diesel & Logistics", proCode: "6130 Utilities & Fleet", amountNgn: "₦2,890,000", sharePct: 19, barClass: "bg-[#059669]" },
      { id: "software", label: "Software & Bank Fees", proCode: "6145 Cloud & Charges", amountNgn: "₦1,240,000", sharePct: 8, barClass: "bg-[#64748B]" },
    ],
    unreconciledCount: 7,
  },
  quarter: {
    id: "quarter",
    label: "This Quarter",
    rangeNote: "Q3 – Q4 2026 · Rolling 90 days",
    netIncomeNgn: "19,820,000.00",
    netIncomeDelta: "+11.6%",
    cashFlowSummary: "Trailing 6 months · QTD surplus +₦29.20M across inflows",
    cashFlowBars: [
      { label: "May", inflowPct: 58, outflowPct: 44, inflowNgn: "₦18.4M", outflowNgn: "₦14.1M" },
      { label: "Jun", inflowPct: 67, outflowPct: 50, inflowNgn: "₦21.2M", outflowNgn: "₦15.6M" },
      { label: "Jul", inflowPct: 76, outflowPct: 56, inflowNgn: "₦23.9M", outflowNgn: "₦17.2M" },
      { label: "Aug", inflowPct: 71, outflowPct: 46, inflowNgn: "₦22.4M", outflowNgn: "₦14.6M" },
      { label: "Sep", inflowPct: 88, outflowPct: 58, inflowNgn: "₦27.1M", outflowNgn: "₦17.9M" },
      { label: "Oct", inflowPct: 95, outflowPct: 53, inflowNgn: "₦29.8M", outflowNgn: "₦16.5M", isCurrent: true },
    ],
    topExpenses: [
      { id: "payroll", label: "Payroll & PAYE", proCode: "6110 Staff Salaries", amountNgn: "₦16,260,000", sharePct: 37, barClass: "bg-[#006838]" },
      { id: "inventory", label: "Stock & Purchases", proCode: "5100 Cost of Goods", amountNgn: "₦12,910,000", sharePct: 29, barClass: "bg-[#0F4C81]" },
      { id: "power", label: "Power, Diesel & Logistics", proCode: "6130 Utilities & Fleet", amountNgn: "₦8,140,000", sharePct: 18, barClass: "bg-[#059669]" },
      { id: "software", label: "Software & Bank Fees", proCode: "6145 Cloud & Charges", amountNgn: "₦3,720,000", sharePct: 8, barClass: "bg-[#64748B]" },
    ],
    unreconciledCount: 14,
  },
  ytd: {
    id: "ytd",
    label: "Year to Date",
    rangeNote: "Jan – Oct 2026 · FY 2026",
    netIncomeNgn: "58,410,000.00",
    netIncomeDelta: "+18.4%",
    cashFlowSummary: "6 recent monthly closes · Positive YTD net reserve ratio 34%",
    cashFlowBars: [
      { label: "May", inflowPct: 60, outflowPct: 45, inflowNgn: "₦18.4M", outflowNgn: "₦14.1M" },
      { label: "Jun", inflowPct: 72, outflowPct: 51, inflowNgn: "₦21.2M", outflowNgn: "₦15.6M" },
      { label: "Jul", inflowPct: 80, outflowPct: 57, inflowNgn: "₦23.9M", outflowNgn: "₦17.2M" },
      { label: "Aug", inflowPct: 74, outflowPct: 48, inflowNgn: "₦22.8M", outflowNgn: "₦15.1M" },
      { label: "Sep", inflowPct: 89, outflowPct: 59, inflowNgn: "₦27.6M", outflowNgn: "₦18.2M" },
      { label: "Oct", inflowPct: 96, outflowPct: 54, inflowNgn: "₦30.2M", outflowNgn: "₦16.9M", isCurrent: true },
    ],
    topExpenses: [
      { id: "payroll", label: "Payroll & PAYE", proCode: "6110 Staff Salaries", amountNgn: "₦49,800,000", sharePct: 35, barClass: "bg-[#006838]" },
      { id: "inventory", label: "Stock & Purchases", proCode: "5100 Cost of Goods", amountNgn: "₦41,250,000", sharePct: 29, barClass: "bg-[#0F4C81]" },
      { id: "power", label: "Power, Diesel & Logistics", proCode: "6130 Utilities & Fleet", amountNgn: "₦25,600,000", sharePct: 18, barClass: "bg-[#059669]" },
      { id: "software", label: "Software & Bank Fees", proCode: "6145 Cloud & Charges", amountNgn: "₦11,450,000", sharePct: 8, barClass: "bg-[#64748B]" },
    ],
    unreconciledCount: 21,
  },
};

const OVERDUE_INVOICES: readonly {
  readonly id: string;
  readonly clientName: string;
  readonly daysOverdue: number;
  readonly amountNgn: string;
  readonly invoiceRef: string;
}[] = [
  {
    id: "inv-2041",
    clientName: "Eko Atlantic Suites Ltd",
    daysOverdue: 18,
    amountNgn: "₦980,000.00",
    invoiceRef: "INV-2041",
  },
  {
    id: "inv-2054",
    clientName: "Zaria Agro Distributors",
    daysOverdue: 11,
    amountNgn: "₦740,000.00",
    invoiceRef: "INV-2054",
  },
  {
    id: "inv-2068",
    clientName: "Abuja Civic Catering",
    daysOverdue: 6,
    amountNgn: "₦430,000.00",
    invoiceRef: "INV-2068",
  },
];

export function OverviewLandingClient({
  authenticatedUser,
  workspaceName,
  workspaceRc,
  accountCount,
  voucherCount,
  bankBalanceNgn,
  receivablesNgn,
  payablesNgn,
}: {
  authenticatedUser: AuthUserSummary | null;
  workspaceName: string;
  workspaceRc: string;
  accountCount: number;
  voucherCount: number;
  bankBalanceNgn: string;
  receivablesNgn: string;
  payablesNgn: string;
}) {
  const { mode } = useWorkspaceMode();
  const prefersReduced = useReducedMotion();
  const [timeframe, setTimeframe] = useState<OverviewTimeframeId>("month");
  const [remindedIds, setRemindedIds] = useState<readonly string[]>([]);
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);

  const activePeriod = TIMEFRAME_DATA[timeframe];

  function handleSendReminder(invoice: (typeof OVERDUE_INVOICES)[number]) {
    if (!remindedIds.includes(invoice.id)) {
      setRemindedIds((prev) => [...prev, invoice.id]);
    }
    setReminderNotice(
      `Payment reminder queued for ${invoice.clientName} (${invoice.invoiceRef} · ${invoice.amountNgn}).`,
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-transparent text-ink">
        <main
          id="main-content"
          className="mx-auto max-w-6xl space-y-8 px-4 py-8 pb-sticky-clearance sm:px-6 sm:py-10"
        >
          {/* Minimalist Workspace Title + Single Global Date Filter */}
          <header className="flex flex-col gap-5 border-b border-borderSubtle pb-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-mutedInk">
                <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                  <span className="h-2 w-2 rounded-full bg-[#006838]" aria-hidden="true" />
                  {workspaceName}
                </span>
                <span aria-hidden="true">&middot;</span>
                <span className="font-mono">{workspaceRc}</span>
                {authenticatedUser ? (
                  <>
                    <span aria-hidden="true">&middot;</span>
                    <span>{authenticatedUser.fullName}</span>
                  </>
                ) : null}
              </div>

              <h1 className="text-3xl font-bold tracking-[-0.03em] text-ink sm:text-4xl">
                Financial Overview
              </h1>
              <p className="text-sm text-mutedInk">
                {activePeriod.rangeNote} &middot;{" "}
                {mode === "simple"
                  ? "Real-time cash standing, profit, and daily actions at a glance."
                  : `${accountCount} active IFRS accounts · ${voucherCount} posted double-entry vouchers`}
              </p>
            </div>

            <div className="flex items-center">
              {/* Single Global Timeframe Control */}
              <div
                role="group"
                aria-label="Global dashboard date filter"
                className="inline-flex items-center rounded-full border border-borderSubtle bg-surfaceAlt p-1"
              >
                {(["month", "quarter", "ytd"] as const).map((tfId) => {
                  const isActive = timeframe === tfId;
                  const label = TIMEFRAME_DATA[tfId].label;
                  return (
                    <button
                      key={tfId}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setTimeframe(tfId)}
                      className={`relative min-h-[44px] rounded-full px-4 py-2 text-xs font-semibold transition ${
                        isActive
                          ? "bg-surface text-ink shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                          : "text-mutedInk hover:text-ink"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          {/* 4 High-Contrast Top-Level KPI Cards (Razor-Sharp, Zero-Blur Physical Lift) */}
          <section
            aria-label="Core financial position cards"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {/* 1. Cash on Hand */}
            <article className="nb-crisp-card-lift group relative overflow-hidden rounded-[24px] border border-borderSubtle bg-surface p-6 shadow-[0_4px_16px_rgba(28,28,30,0.04)] hover:border-[#006838]/50">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-mutedInk">
                  Cash on Hand
                </p>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#E6F5ED] dark:bg-emerald-950/40 text-[#006838] dark:text-emerald-400 shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5">
                  <Wallet className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 flex items-baseline whitespace-nowrap font-mono text-xl font-bold tracking-[-0.025em] tabular-nums text-ink sm:text-2xl xl:text-[22px] 2xl:text-[26px]">
                <span className="inline-flex items-baseline whitespace-nowrap">
                  <NairaSign className="mr-0.5 shrink-0" />
                  <span>{bankBalanceNgn}</span>
                </span>
              </p>
              <p className="mt-2 text-xs text-mutedInk">
                {mode === "pro"
                  ? `1110 Zenith, GTBank & Moniepoint POS (${accountCount} GL)`
                  : "Combined liquid balance across bank & POS"}
              </p>
            </article>

            {/* 2. Net Income */}
            <article className="nb-crisp-card-lift group relative overflow-hidden rounded-[24px] border border-borderSubtle bg-surface p-6 shadow-[0_4px_16px_rgba(28,28,30,0.04)] hover:border-[#006838]/50">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-mutedInk">
                  Net Income
                </p>
                <Badge variant="emerald" className="gap-1 px-2.5 py-0.5 font-mono text-[11px] shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5">
                  <TrendingUp className="h-3 w-3" aria-hidden="true" />
                  {activePeriod.netIncomeDelta}
                </Badge>
              </div>
              <p className="mt-4 flex items-baseline whitespace-nowrap font-mono text-xl font-bold tracking-[-0.025em] tabular-nums text-ink sm:text-2xl xl:text-[22px] 2xl:text-[26px]">
                <span className="inline-flex items-baseline whitespace-nowrap">
                  <NairaSign className="mr-0.5 shrink-0" />
                  <span>{activePeriod.netIncomeNgn}</span>
                </span>
              </p>
              <p className="mt-2 text-xs text-mutedInk">
                {mode === "pro"
                  ? `Net Surplus after OpEx · ${activePeriod.label}`
                  : `Revenue minus expenses · ${activePeriod.label}`}
              </p>
            </article>

            {/* 3. Total Receivables */}
            <article className="nb-crisp-card-lift group relative overflow-hidden rounded-[24px] border border-borderSubtle bg-surface p-6 shadow-[0_4px_16px_rgba(28,28,30,0.04)] hover:border-[#0F4C81]/50">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-mutedInk">
                  Total Receivables
                </p>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#EAF3FC] dark:bg-sky-950/40 text-[#0F4C81] dark:text-sky-400 shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 flex items-baseline whitespace-nowrap font-mono text-xl font-bold tracking-[-0.025em] tabular-nums text-ink sm:text-2xl xl:text-[22px] 2xl:text-[26px]">
                <span className="inline-flex items-baseline whitespace-nowrap">
                  <NairaSign className="mr-0.5 shrink-0" />
                  <span>{receivablesNgn}</span>
                </span>
              </p>
              <p className="mt-2 text-xs text-mutedInk">
                {mode === "pro"
                  ? `1200 Trade AR · ${OVERDUE_INVOICES.length} past due invoices`
                  : `Open customer invoices (${OVERDUE_INVOICES.length} overdue)`}
              </p>
            </article>

            {/* 4. Total Payables */}
            <article className="nb-crisp-card-lift group relative overflow-hidden rounded-[24px] border border-borderSubtle bg-surface p-6 shadow-[0_4px_16px_rgba(28,28,30,0.04)] hover:border-ink/40">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-mutedInk">
                  Total Payables
                </p>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-surfaceAlt text-ink shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5">
                  <Receipt className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 flex items-baseline whitespace-nowrap font-mono text-xl font-bold tracking-[-0.025em] tabular-nums text-ink sm:text-2xl xl:text-[22px] 2xl:text-[26px]">
                <span className="inline-flex items-baseline whitespace-nowrap">
                  <NairaSign className="mr-0.5 shrink-0" />
                  <span>{payablesNgn}</span>
                </span>
              </p>
              <p className="mt-2 text-xs text-mutedInk">
                {mode === "pro"
                  ? "2100 Trade AP + NRS 7.5% VAT & WHT due <= 30d"
                  : "Vendor bills & taxes due within 30 days"}
              </p>
            </article>
          </section>

          {/* Center Core Visuals: 2 Clean Charts */}
          <section
            aria-label="Financial momentum charts"
            className="grid gap-6 lg:grid-cols-12"
          >
            {/* Chart 1: Cash Flow Trend (6 Months Dual Bar) */}
            <div className="rounded-[28px] border border-borderSubtle bg-surface p-6 shadow-[0_6px_20px_rgba(28,28,30,0.04)] sm:p-8 lg:col-span-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold tracking-[-0.02em] text-ink">
                    Cash Flow Trend
                  </h2>
                  <p className="mt-0.5 text-xs text-mutedInk">
                    {renderWithNairaSign(activePeriod.cashFlowSummary)}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium text-ink">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#006838]" aria-hidden="true" />
                    Money In
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#94A3B8] dark:bg-slate-500" aria-hidden="true" />
                    Money Out
                  </span>
                </div>
              </div>

              <div
                role="img"
                aria-label="Six month Cash Flow Trend comparing Money In against Money Out"
                className="mt-8 grid grid-cols-6 items-end gap-3 border-b border-borderSubtle pb-3 sm:gap-5"
              >
                {activePeriod.cashFlowBars.map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-2">
                    <div className="flex h-44 w-full items-end justify-center gap-1.5 sm:gap-2">
                      <motion.div
                        key={`${timeframe}-${item.label}-in`}
                        initial={prefersReduced ? false : { height: 0 }}
                        animate={{ height: `${item.inflowPct}%` }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        title={`${item.label} Money In: ${item.inflowNgn}`}
                        className="w-4 rounded-t-[6px] bg-[#006838] sm:w-5"
                      />
                      <motion.div
                        key={`${timeframe}-${item.label}-out`}
                        initial={prefersReduced ? false : { height: 0 }}
                        animate={{ height: `${item.outflowPct}%` }}
                        transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
                        title={`${item.label} Money Out: ${item.outflowNgn}`}
                        className="w-4 rounded-t-[6px] bg-[#94A3B8] dark:bg-slate-500 sm:w-5"
                      />
                    </div>
                    <span
                      className={`text-xs ${
                        item.isCurrent
                          ? "font-bold text-ink"
                          : "font-medium text-mutedInk"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: Top Expense Categories (Minimal Horizontal Bars) */}
            <div className="rounded-[28px] border border-borderSubtle bg-surface p-6 shadow-[0_6px_20px_rgba(28,28,30,0.04)] sm:p-8 lg:col-span-5">
              <div>
                <h2 className="text-lg font-bold tracking-[-0.02em] text-ink">
                  Top Expense Categories
                </h2>
                <p className="mt-0.5 text-xs text-mutedInk">
                  Top 4 spending areas for {activePeriod.label}
                </p>
              </div>

              <div className="mt-7 space-y-5">
                {activePeriod.topExpenses.map((cat) => (
                  <div key={cat.id} className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-semibold text-ink">
                        {mode === "pro" ? cat.proCode : cat.label}
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-ink">
                        {renderWithNairaSign(cat.amountNgn)}{" "}
                        <span className="font-normal text-mutedInk">({cat.sharePct}%)</span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surfaceAlt">
                      <motion.div
                        key={`${timeframe}-${cat.id}`}
                        initial={prefersReduced ? false : { width: 0 }}
                        animate={{ width: `${Math.min(100, cat.sharePct * 2)}%` }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        className={`h-full rounded-full ${cat.barClass}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Bottom Compact Actionable Alerts */}
          <section
            aria-labelledby="actionable-alerts-heading"
            className="rounded-[28px] border border-borderSubtle bg-surface p-6 shadow-[0_6px_20px_rgba(28,28,30,0.04)] sm:p-8"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2
                  id="actionable-alerts-heading"
                  className="text-lg font-bold tracking-[-0.02em] text-ink"
                >
                  Daily Actionable Alerts
                </h2>
                <p className="mt-0.5 text-xs text-mutedInk">
                  Clear these quick items to keep your dashboard figures 100% accurate.
                </p>
              </div>
              {reminderNotice ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="rounded-full bg-[#E6F5ED] dark:bg-emerald-950/40 px-3.5 py-1.5 text-xs font-medium text-[#00582E] dark:text-emerald-400"
                >
                  {reminderNotice}
                </p>
              ) : null}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-12">
              {/* Unreconciled Transactions Alert */}
              <div className="nb-crisp-card-lift flex flex-col justify-between rounded-[20px] border border-borderSubtle bg-surfaceAlt p-5 lg:col-span-5 hover:border-[#006838]/50 hover:bg-surface hover:shadow-[0_10px_24px_rgba(0,104,56,0.06)]">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                      <FileWarning className="h-4 w-4 text-[#006838] dark:text-emerald-400" aria-hidden="true" />
                      Unreconciled Transactions
                    </span>
                    <Badge variant="outline" className="font-mono text-ink border-borderSubtle">
                      {activePeriod.unreconciledCount} pending
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-mutedInk">
                    {activePeriod.unreconciledCount} Zenith Bank &amp; Moniepoint POS bank feed
                    lines are waiting for quick category match.
                  </p>
                </div>

                <div className="mt-5">
                  <Button variant="emerald" size="sm" asChild className="min-h-[44px] rounded-full px-4">
                    <Link href="/reconcile">
                      <span>Review &amp; Match Feed</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* 3 Oldest Overdue Invoices */}
              <div className="nb-crisp-card-lift rounded-[20px] border border-borderSubtle bg-surfaceAlt p-5 lg:col-span-7 hover:border-[#0F4C81]/50 hover:bg-surface hover:shadow-[0_10px_24px_rgba(15,76,129,0.06)]">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
                    <BellRing className="h-4 w-4 text-[#0F4C81] dark:text-sky-400" aria-hidden="true" />
                    Overdue Invoices (3 Oldest)
                  </h3>
                  <Link
                    href="/books/journal"
                    className="text-xs font-semibold text-[#00582E] dark:text-emerald-400 underline-offset-4 hover:underline"
                  >
                    Open Books &rarr;
                  </Link>
                </div>

                <div className="mt-3 divide-y divide-borderSubtle">
                  {OVERDUE_INVOICES.map((inv) => {
                    const alreadyReminded = remindedIds.includes(inv.id);
                    return (
                      <div
                        key={inv.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-2 last:pb-0"
                      >
                        <div>
                          <p className="text-xs font-semibold text-ink">
                            {inv.clientName}
                          </p>
                          <p className="text-[11px] text-mutedInk">
                            {inv.invoiceRef} &middot; {inv.daysOverdue} days overdue
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold tabular-nums text-ink">
                            {renderWithNairaSign(inv.amountNgn)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSendReminder(inv)}
                            className={`inline-flex min-h-[44px] items-center gap-1 rounded-full px-3.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006838] ${
                              alreadyReminded
                                ? "bg-[#E6F5ED] dark:bg-emerald-950/40 text-[#00582E] dark:text-emerald-400"
                                : "border border-borderSubtle bg-surface text-ink hover:bg-surfaceAlt"
                            }`}
                          >
                            {alreadyReminded ? (
                              <>
                                <Check className="h-3 w-3" aria-hidden="true" />
                                <span>Reminded</span>
                              </>
                            ) : (
                              <span>Send Reminder</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </MotionConfig>
  );
}
