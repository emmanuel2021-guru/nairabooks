"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  X,
  FileCheck,
} from "lucide-react";
import {
  ACCESS_BANK_PARSED_TRANSACTIONS,
  ACCESS_BANK_SAMPLE_METADATA,
  type BankStatementMetadata,
  type ParsedStatementLine,
} from "./reconcile-data";

export function BankStatementUploader({
  statementMetadata,
  onStatementLoaded,
  onResetStatement,
}: {
  readonly statementMetadata: BankStatementMetadata | null;
  readonly onStatementLoaded: (
    metadata: BankStatementMetadata,
    transactions: readonly ParsedStatementLine[],
  ) => void;
  readonly onResetStatement: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulateParsePdf = (file: File) => {
    setIsProcessing(true);
    setFileName(file.name);

    // Simulate smart OCR / PDF parsing delay with realistic progress
    setTimeout(() => {
      setIsProcessing(false);
      onStatementLoaded(ACCESS_BANK_SAMPLE_METADATA, ACCESS_BANK_PARSED_TRANSACTIONS);
    }, 1200);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0]) {
      simulateParsePdf(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0]) {
      simulateParsePdf(files[0]);
    }
  };

  const handleLoadSample = () => {
    setIsProcessing(true);
    setFileName("Statement_1858587600_20261112203302.pdf");
    setTimeout(() => {
      setIsProcessing(false);
      onStatementLoaded(ACCESS_BANK_SAMPLE_METADATA, ACCESS_BANK_PARSED_TRANSACTIONS);
    }, 800);
  };

  return (
    <div className="rounded-[24px] border border-[#E5E5EA] bg-white p-6 shadow-[0_6px_20px_rgba(28,28,30,0.04)]">
      <AnimatePresence mode="wait">
        {!statementMetadata ? (
          <motion.div
            key="upload-zone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-[#1C1C1E]">
                  Upload Bank Statement
                </h2>
                <p className="text-xs text-[#5E5E64]">
                  Upload a PDF or CSV statement from any licensed Nigerian commercial bank or fintech (Zenith, GTBank, First Bank, Access Bank, UBA, Stanbic IBTC, Kuda, Moniepoint, etc.) to start reconciliation.
                </p>
              </div>

              <button
                type="button"
                onClick={handleLoadSample}
                disabled={isProcessing}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#006838] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#00552D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
              >
                {isProcessing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
                <span>Auto-Load Verified Commercial Statement</span>
              </button>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
                isDragging
                  ? "border-[#006838] bg-[#006838]/5"
                  : "border-[#D1D1D6] hover:border-[#8E8E93] bg-[#FAFAFC]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.xlsx"
                aria-label="Upload Bank Statement PDF"
                onChange={handleFileChange}
                className="sr-only"
              />

              {isProcessing ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-full border-4 border-[#006838] border-t-transparent animate-spin" />
                  <p className="text-sm font-semibold text-[#1C1C1E]">
                    Reading {fileName ?? "Bank Statement PDF"}...
                  </p>
                  <p className="text-xs text-[#5E5E64]">
                    Extracting transactions, NIP transfers, POS settlements, fees, and running balances.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-[#E5E5EA] text-[#006838] shadow-sm">
                    <UploadCloud className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1C1C1E]">
                      Drag and drop your Bank Statement PDF here
                    </p>
                    <p className="mt-1 text-xs text-[#5E5E64]">
                      Supports all licensed Nigerian commercial banks &amp; fintechs (.pdf, .csv, .xlsx).
                    </p>
                  </div>
                  <span className="inline-flex min-h-[44px] items-center rounded-full border border-[#D1D1D6] bg-white px-4 text-xs font-semibold text-[#1C1C1E] shadow-sm hover:bg-[#F2F2F7]">
                    Browse Statement File
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="statement-summary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E5EA] pb-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#006838] text-white shadow-sm">
                  <FileCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#1C1C1E]">
                      {statementMetadata.bankName}
                    </h2>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#006838]">
                      Parsed Statement
                    </span>
                  </div>
                  <p className="text-xs text-[#5E5E64]">
                    {statementMetadata.accountName} &middot; Acct #{statementMetadata.accountNumber} &middot; {statementMetadata.branchAddress}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#5E5E64]">
                  {statementMetadata.period}
                </span>
                <button
                  type="button"
                  onClick={onResetStatement}
                  aria-label="Upload different statement"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#1C1C1E] transition hover:bg-[#FAFAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Replace Statement</span>
                </button>
              </div>
            </div>

            {/* Quick Financial Summary Grid from PDF */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 text-xs">
              <div className="rounded-xl border border-[#E5E5EA] bg-[#FAFAFC] p-3">
                <span className="text-[11px] font-medium text-[#5E5E64] uppercase tracking-wider">
                  Opening Balance
                </span>
                <p className="mt-1 font-mono font-bold text-[#1C1C1E]">
                  ₦{statementMetadata.openingBalanceNgn}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <span className="text-[11px] font-medium text-emerald-800 uppercase tracking-wider">
                  Total Deposits
                </span>
                <p className="mt-1 font-mono font-bold text-[#006838]">
                  +₦{statementMetadata.totalDepositsNgn}
                </p>
              </div>

              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                <span className="text-[11px] font-medium text-rose-800 uppercase tracking-wider">
                  Total Withdrawals
                </span>
                <p className="mt-1 font-mono font-bold text-rose-700">
                  -₦{statementMetadata.totalWithdrawalsNgn}
                </p>
              </div>

              <div className="rounded-xl border border-[#E5E5EA] bg-white p-3 shadow-sm">
                <span className="text-[11px] font-medium text-[#5E5E64] uppercase tracking-wider">
                  Closing Balance
                </span>
                <p className="mt-1 font-mono font-bold text-[#1C1C1E]">
                  ₦{statementMetadata.closingBalanceNgn}
                </p>
              </div>

              <div className="rounded-xl border border-[#E5E5EA] bg-[#FAFAFC] p-3">
                <span className="text-[11px] font-medium text-[#5E5E64] uppercase tracking-wider">
                  Cleared Balance
                </span>
                <p className="mt-1 font-mono font-bold text-[#1C1C1E]">
                  ₦{statementMetadata.clearedBalanceNgn}
                </p>
              </div>

              <div className="rounded-xl border border-[#E5E5EA] bg-[#FAFAFC] p-3">
                <span className="text-[11px] font-medium text-[#5E5E64] uppercase tracking-wider">
                  UnCleared Balance
                </span>
                <p className="mt-1 font-mono font-bold text-[#1C1C1E]">
                  ₦{statementMetadata.unClearedBalanceNgn}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
