"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, TrendingUp } from "lucide-react";
import {
  formatBalanceWithSide,
  formatNairaAmount,
  parseNairaNumeric,
  type BalanceSide,
} from "@/components/admin/admin-maintain-data";
import type { EditorTabSpec } from "@/components/admin/admin-editor-schemas";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

interface WidgetProps {
  readonly widget: NonNullable<EditorTabSpec["widget"]>;
  readonly balanceAmount: string;
  readonly balanceSide: BalanceSide;
  readonly details: Readonly<Record<string, string>>;
  readonly onUpdateDetail: (key: string, value: string) => void;
}

export function AdminEditorTabWidget({
  widget,
  balanceAmount,
  balanceSide,
  details,
  onUpdateDetail,
}: WidgetProps) {
  const prefersReduced = useReducedMotion();

  if (widget === "customer-history" || widget === "vendor-history") {
    const isCustomer = widget === "customer-history";
    const formattedBalance = formatBalanceWithSide(balanceAmount || "₦0", balanceSide);
    const isDebit = balanceSide === "DR";

    return (
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <motion.div
          initial={prefersReduced ? false : { scale: 0.97, opacity: 0.85 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="rounded-[18px] border border-[#E5E5EA] bg-[#FAFAFC] p-4"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5E5E64]">
            Current Ledger Balance
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="font-mono text-lg font-bold tabular-nums text-[#1C1C1E]">
              {formattedBalance}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isDebit
                  ? "bg-[#E6F5ED] text-[#00582E]"
                  : "bg-[#FEF3C7] text-[#92400E]"
              }`}
            >
              {isDebit ? "Debit Balance" : "Credit Balance"}
            </span>
          </div>
        </motion.div>

        <div className="rounded-[18px] border border-[#E5E5EA] bg-[#FAFAFC] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5E5E64]">
            {isCustomer ? "Last Invoice Posted" : "Last Supplier Bill"}
          </p>
          <p className="mt-1.5 font-mono text-base font-bold tabular-nums text-[#1C1C1E]">
            {isCustomer ? "₦640,000 · Oct 28" : "₦480,000 · Oct 24"}
          </p>
        </div>

        <div className="rounded-[18px] border border-[#E5E5EA] bg-[#FAFAFC] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5E5E64]">
            {isCustomer ? "Credit Limit Control" : "NRS WHT Classification"}
          </p>
          <p className="mt-1.5 font-mono text-base font-bold text-[#1C1C1E]">
            {isCustomer
              ? details.creditLimit || "₦2,500,000"
              : details.whtType || "2% Corporate"}
          </p>
        </div>
      </div>
    );
  }

  if (widget === "account-period-history") {
    const currentNum = Math.max(0, parseNairaNumeric(balanceAmount || "₦0"));
    const baseSlice = Math.round(currentNum * 0.18);
    const periods = [
      { period: "Period 08 · Aug", debits: baseSlice + 420000, credits: 180000 },
      { period: "Period 09 · Sep", debits: baseSlice + 250000, credits: 95000 },
      { period: "Period 10 · Oct", debits: currentNum > 0 ? currentNum : 320000, credits: 110000 },
    ];

    return (
      <div className="mb-5 overflow-hidden rounded-[18px] border border-[#E5E5EA] bg-[#FAFAFC]">
        <div className="flex items-center justify-between border-b border-[#E5E5EA] px-4 py-2.5">
          <span className="text-xs font-bold text-[#1C1C1E]">
            FY 2026 Period History Ledger
          </span>
          <span className="rounded-full bg-white px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#00582E]">
            {balanceSide} Normal
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E5EA] bg-white text-[11px] text-[#5E5E64]">
                <th className="px-4 py-2 font-semibold">Period</th>
                <th className="px-4 py-2 text-right font-semibold">Debits</th>
                <th className="px-4 py-2 text-right font-semibold">Credits</th>
                <th className="px-4 py-2 text-right font-semibold">Net Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA] bg-white font-mono tabular-nums">
              {periods.map((row) => {
                const net = row.debits - row.credits;
                return (
                  <tr key={row.period}>
                    <td className="px-4 py-2.5 font-sans font-medium text-[#1C1C1E]">
                      {row.period}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[#1C1C1E]">
                      {formatNairaAmount(row.debits)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[#5E5E64]">
                      {formatNairaAmount(row.credits)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-[#00582E]">
                      {formatNairaAmount(Math.abs(net))} {net >= 0 ? "DR" : "CR"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (widget === "budget-12m-grid") {
    const defaultMonthly = Math.max(100000, parseNairaNumeric(balanceAmount || "₦1,200,000"));
    const monthValues = MONTHS.map((_, idx) => {
      const stored = details[`month_${idx}`];
      return stored !== undefined ? Number(stored) || 0 : defaultMonthly;
    });
    const annualTotal = monthValues.reduce((acc, v) => acc + v, 0);

    return (
      <div className="mb-5 space-y-3 rounded-[18px] border border-[#E5E5EA] bg-[#FAFAFC] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-[#1C1C1E]">
              12-Month Period Allocation Grid (₦)
            </p>
            <p className="text-[11px] text-[#5E5E64]">
              Edit any month below to recalibrate your annual cost-center ceiling live.
            </p>
          </div>
          <div className="rounded-full bg-[#E6F5ED] px-3.5 py-1.5 font-mono text-xs font-bold tabular-nums text-[#00582E]">
            Annual Total: {formatNairaAmount(annualTotal)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
          {MONTHS.map((m, idx) => (
            <div key={m}>
              <label
                htmlFor={`budget-month-${idx}`}
                className="block text-[11px] font-semibold text-[#5E5E64]"
              >
                {m} 2026
              </label>
              <input
                id={`budget-month-${idx}`}
                type="number"
                value={monthValues[idx]}
                onChange={(e) => onUpdateDetail(`month_${idx}`, e.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-2.5 font-mono text-xs tabular-nums text-[#1C1C1E]"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (widget === "inventory-stock-kpi") {
    const onHand = Number(details.qtyOnHand ?? 42) || 0;
    const onSo = Number(details.qtyOnSo ?? 6) || 0;
    const minStock = Number(details.minStock ?? 15) || 0;
    const available = Math.max(0, onHand - onSo);
    const lowStock = available <= minStock;

    return (
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] border border-[#E5E5EA] bg-[#FAFAFC] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5E5E64]">
            Qty on Hand (Physical)
          </p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#1C1C1E]">
            {onHand} units
          </p>
        </div>
        <div className="rounded-[18px] border border-[#E5E5EA] bg-[#FAFAFC] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5E5E64]">
            Qty Available to Promise
          </p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#00582E]">
            {available} units
          </p>
        </div>
        <div className="rounded-[18px] border border-[#E5E5EA] bg-[#FAFAFC] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5E5E64]">
            Reorder Status
          </p>
          <p
            className={`mt-1 text-sm font-bold ${
              lowStock ? "text-[#B45309]" : "text-[#00582E]"
            }`}
          >
            {lowStock
              ? `Low Stock (Min ${minStock})`
              : `Healthy Buffer (Min ${minStock})`}
          </p>
        </div>
      </div>
    );
  }

  if (widget === "job-progress-kpi") {
    const pct = Math.max(0, Math.min(100, Number(details.percentComplete ?? 45) || 0));
    const estRev = Number(details.estimatedRevenue ?? 6500000) || 0;
    const estCost = Number(details.estimatedCost ?? 4100000) || 0;
    const margin = estRev - estCost;

    return (
      <div className="mb-5 rounded-[18px] border border-[#E5E5EA] bg-[#FAFAFC] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-[#1C1C1E]">
              Job Completion &amp; Estimated Profit Margin
            </p>
            <p className="text-[11px] text-[#5E5E64]">
              Projected Net Margin:{" "}
              <span className="font-mono font-bold text-[#00582E]">
                {formatNairaAmount(margin)}
              </span>
            </p>
          </div>
          <span className="rounded-full bg-[#E6F5ED] px-3 py-1 font-mono text-xs font-bold text-[#00582E]">
            {pct}% Complete
          </span>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#E5E5EA]">
          <motion.div
            initial={prefersReduced ? false : { width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="h-full rounded-full bg-[#006838]"
          />
        </div>
      </div>
    );
  }

  if (widget === "employee-statutory-kpi") {
    const gross = Number(details.monthlyGross ?? 680000) || 0;
    const empPension = Math.round(gross * 0.08);
    const coPension = Math.round(gross * 0.1);
    const nhf = Math.round(gross * 0.025);

    return (
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] border border-[#E5E5EA] bg-[#FAFAFC] p-4">
          <p className="text-[11px] font-semibold text-[#5E5E64]">Employee PenCom (8%)</p>
          <p className="mt-1 font-mono text-base font-bold tabular-nums text-[#1C1C1E]">
            {formatNairaAmount(empPension)} / mo
          </p>
        </div>
        <div className="rounded-[18px] border border-[#E5E5EA] bg-[#FAFAFC] p-4">
          <p className="text-[11px] font-semibold text-[#5E5E64]">Employer PenCom (10%)</p>
          <p className="mt-1 font-mono text-base font-bold tabular-nums text-[#00582E]">
            {formatNairaAmount(coPension)} / mo
          </p>
        </div>
        <div className="rounded-[18px] border border-[#E5E5EA] bg-[#FAFAFC] p-4">
          <p className="text-[11px] font-semibold text-[#5E5E64]">NHF Relief (2.5%)</p>
          <p className="mt-1 font-mono text-base font-bold tabular-nums text-[#1C1C1E]">
            {formatNairaAmount(nhf)} / mo
          </p>
        </div>
      </div>
    );
  }

  if (widget === "asset-depreciation-kpi") {
    const cost = Number(details.acquisitionCost ?? 14500000) || 0;
    const residual = Number(details.residualValue ?? 1500000) || 0;
    const years = Math.max(1, Number(details.usefulLifeYears ?? 5) || 1);
    const annual = Math.max(0, Math.round((cost - residual) / years));
    const monthly = Math.round(annual / 12);

    return (
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[18px] border border-[#E5E5EA] bg-[#FAFAFC] p-4">
          <p className="text-[11px] font-semibold text-[#5E5E64]">
            IAS 16 Annual Depreciation
          </p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#1C1C1E]">
            {formatNairaAmount(annual)} / yr
          </p>
        </div>
        <div className="rounded-[18px] border border-[#E5E5EA] bg-[#FAFAFC] p-4">
          <p className="text-[11px] font-semibold text-[#5E5E64]">
            Monthly Journal Charge (Dr Depr Exp / Cr 1590)
          </p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#00582E]">
            {formatNairaAmount(monthly)} / mo
          </p>
        </div>
      </div>
    );
  }

  if (widget === "price-preview-kpi") {
    const pct = Number(details.adjustmentPct ?? -8) || 0;
    const sampleBase = 100000;
    const resulting = Math.max(0, Math.round(sampleBase * (1 + pct / 100)));

    return (
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#E5E5EA] bg-[#FAFAFC] p-4">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-5 w-5 text-[#006838]" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold text-[#1C1C1E]">Live Tier Price Simulator</p>
            <p className="text-[11px] text-[#5E5E64]">
              On a base ₦100,000 catalogue item at {pct >= 0 ? `+${pct}%` : `${pct}%`}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-[#E6F5ED] px-4 py-1.5 font-mono text-sm font-bold text-[#00582E]">
          Invoice Price: {formatNairaAmount(resulting)}
        </span>
      </div>
    );
  }

  // journal-pair-preview
  const amt = Math.max(0, Number(details.amountNgn ?? 450000) || 0);
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#E5E5EA] bg-[#FAFAFC] p-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-[#006838]" aria-hidden="true" />
        <span className="text-xs font-bold text-[#1C1C1E]">
          Double-Entry Balanced Recurring Pair
        </span>
      </div>
      <span className="font-mono text-xs font-bold text-[#00582E]">
        DR {formatNairaAmount(amt)} = CR {formatNairaAmount(amt)}
      </span>
    </div>
  );
}
