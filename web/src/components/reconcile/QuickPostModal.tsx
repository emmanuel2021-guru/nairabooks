"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, PlusCircle, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { ParsedStatementLine, CompanyLedgerEntry } from "./reconcile-data";
import type { ChartOfAccount } from "@/types/ledger";

export function QuickPostModal({
  isOpen,
  statementLine,
  accounts,
  onClose,
  onPostAndMatch,
}: {
  readonly isOpen: boolean;
  readonly statementLine: ParsedStatementLine | null;
  readonly accounts: readonly ChartOfAccount[];
  readonly onClose: () => void;
  readonly onPostAndMatch: (newEntry: CompanyLedgerEntry, statementLineId: string) => void;
}) {
  const [selectedGlCode, setSelectedGlCode] = useState<string>(
    statementLine?.defaultGlCode ?? "5130",
  );
  const [memo, setMemo] = useState<string>(statementLine?.description ?? "");
  const [payee, setPayee] = useState<string>(
    statementLine?.category === "BANK_FEE" || statementLine?.category === "CARD_FEE"
      ? "Commercial Bank"
      : statementLine?.category === "INTEREST" || statementLine?.category === "TAX_WHT"
        ? "Federal Inland Revenue Service / Bank"
        : "Direct Payee",
  );

  if (!isOpen || !statementLine) return null;

  const isDeposit = statementLine.credit !== null && Number(statementLine.credit) > 0;
  const amountStr = isDeposit ? statementLine.credit! : statementLine.debit ?? "0.00";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: CompanyLedgerEntry = {
      id: `LEDGER-GEN-${Date.now()}`,
      date: statementLine.valueDate,
      voucherRef: `JV-${statementLine.valueDate.replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`,
      memo: memo || statementLine.description,
      payeeOrCustomer: payee,
      debitNgn: isDeposit ? amountStr : null,
      creditNgn: isDeposit ? null : amountStr,
      glAccountCode: selectedGlCode,
    };
    onPostAndMatch(newEntry, statementLine.id);
    onClose();
  };

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-post-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="relative w-full max-w-lg rounded-[28px] border border-[#E5E5EA] bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-[#1C1C1E]"
        >
          <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-4">
            <div className="flex items-center gap-2.5">
              <div
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${
                  isDeposit ? "bg-emerald-50 text-[#006838]" : "bg-blue-50 text-blue-700"
                }`}
              >
                {isDeposit ? (
                  <ArrowDownLeft className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                )}
              </div>
              <div>
                <h2 id="quick-post-title" className="text-base font-bold text-[#1C1C1E]">
                  Quick Post Bank Item to Books
                </h2>
                <p className="text-xs text-[#5E5E64]">
                  Create a double-entry voucher from this bank statement line and auto-reconcile.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[#5E5E64] transition hover:bg-[#F2F2F7] hover:text-[#1C1C1E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Amount & Date Card */}
            <div className="rounded-2xl border border-[#E5E5EA] bg-[#FAFAFC] p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#5E5E64] uppercase tracking-wider">
                  Statement Narrative
                </span>
                <p className="mt-0.5 text-xs font-mono font-medium text-[#1C1C1E] line-clamp-2">
                  {statementLine.description}
                </p>
                <p className="mt-1 text-[11px] text-[#5E5E64]">
                  Value Date: <span className="font-semibold">{statementLine.valueDate}</span>
                </p>
              </div>

              <div className="text-right shrink-0 pl-3">
                <span className="text-[11px] font-semibold text-[#5E5E64] uppercase tracking-wider">
                  Amount
                </span>
                <p
                  className={`mt-0.5 text-lg font-mono font-bold ${
                    isDeposit ? "text-[#006838]" : "text-rose-700"
                  }`}
                >
                  {isDeposit ? `+₦${amountStr}` : `-₦${amountStr}`}
                </p>
                <span className="text-[10px] text-[#5E5E64]">
                  {isDeposit ? "Credit (Deposit)" : "Debit (Withdrawal)"}
                </span>
              </div>
            </div>

            {/* Target Expense / Revenue GL Account */}
            <div>
              <label
                htmlFor="gl-account-select"
                className="block text-xs font-semibold uppercase tracking-wider text-[#5E5E64]"
              >
                Offset GL Account (Nigerian IFRS)
              </label>
              <select
                id="gl-account-select"
                value={selectedGlCode}
                onChange={(e) => setSelectedGlCode(e.target.value)}
                className="mt-1 block min-h-[44px] w-full rounded-xl border border-[#D1D1D6] bg-white px-3 py-2 text-sm text-[#1C1C1E] focus:border-[#006838] focus:outline-none focus:ring-1 focus:ring-[#006838]"
              >
                <optgroup label="Recommended for this narrative">
                  <option value={statementLine.defaultGlCode}>
                    {statementLine.defaultGlCode} — {statementLine.defaultGlName}
                  </option>
                </optgroup>
                <optgroup label="Operating Expenses">
                  <option value="5130">5130 — Bank Charges, SMS Alert & POS Fees</option>
                  <option value="5120">5120 — Software Subscriptions & Digital Services</option>
                  <option value="5100">5100 — Contractor & Professional Services</option>
                  <option value="5200">5200 — Office & Administrative Expenses</option>
                </optgroup>
                <optgroup label="Revenues & Other Income">
                  <option value="4010">4010 — Sales Revenue / Customer Inflows</option>
                  <option value="4200">4200 — Interest & Finance Income</option>
                </optgroup>
                <optgroup label="Taxes & Balances">
                  <option value="2130">2130 — Withholding Tax (WHT) Payable</option>
                  <option value="1030">1030 — Petty Cash & Inter-Account Transfers</option>
                </optgroup>
              </select>
            </div>

            {/* Payee / Customer */}
            <div>
              <label
                htmlFor="payee-input"
                className="block text-xs font-semibold uppercase tracking-wider text-[#5E5E64]"
              >
                Payee / Beneficiary / Bank
              </label>
              <input
                id="payee-input"
                type="text"
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                className="mt-1 block min-h-[44px] w-full rounded-xl border border-[#D1D1D6] bg-white px-3 py-2 text-sm text-[#1C1C1E] focus:border-[#006838] focus:outline-none focus:ring-1 focus:ring-[#006838]"
              />
            </div>

            {/* Memo */}
            <div>
              <label
                htmlFor="memo-input"
                className="block text-xs font-semibold uppercase tracking-wider text-[#5E5E64]"
              >
                Voucher Memo
              </label>
              <input
                id="memo-input"
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="mt-1 block min-h-[44px] w-full rounded-xl border border-[#D1D1D6] bg-white px-3 py-2 text-sm text-[#1C1C1E] focus:border-[#006838] focus:outline-none focus:ring-1 focus:ring-[#006838]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-[44px] items-center rounded-full border border-[#D1D1D6] bg-white px-4 text-xs font-semibold text-[#1C1C1E] hover:bg-[#F2F2F7]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#006838] px-5 text-xs font-semibold text-white shadow-sm hover:bg-[#00552D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                <span>Post Voucher &amp; Reconcile</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
