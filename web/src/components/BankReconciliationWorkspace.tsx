"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  Download,
  ShieldCheck,
  FileSpreadsheet,
  Check,
  Globe,
  SlidersHorizontal,
  Landmark,
  Layers,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  FileText,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Zap,
  Lock,
  Unlock,
  Printer,
} from "lucide-react";
import { useWorkspaceMode } from "@/state/workspace-mode";
import type {
  BankReconciliationReport,
  ChartOfAccount,
  CurrencyCode,
  FxRevaluationReport,
  MutationError,
} from "@/types/ledger";
import {
  ACCESS_BANK_SAMPLE_METADATA,
  ACCESS_BANK_PARSED_TRANSACTIONS,
  INITIAL_COMPANY_LEDGER_ENTRIES,
  type BankStatementMetadata,
  type ParsedStatementLine,
  type CompanyLedgerEntry,
} from "./reconcile/reconcile-data";
import { ReconcileIconBadge } from "./reconcile/ReconcileIconBadge";
import { BankStatementUploader } from "./reconcile/BankStatementUploader";
import { QuickPostModal } from "./reconcile/QuickPostModal";

const DEMO_MATCHED_PAIRS: Readonly<Record<string, string>> = {
  "STMT-014": "LEDGER-001",
  "STMT-022": "LEDGER-002",
  "STMT-011": "LEDGER-003",
  "STMT-033": "LEDGER-004",
  "STMT-038": "LEDGER-005",
  "STMT-004": "LEDGER-006",
  "STMT-019": "LEDGER-007",
  "STMT-006": "LEDGER-008",
  "STMT-034": "LEDGER-009",
  "STMT-039": "LEDGER-010",
  "STMT-015": "LEDGER-011",
  "STMT-013": "LEDGER-012",
  "STMT-023": "LEDGER-013",
  "STMT-012": "LEDGER-014",
};

export function BankReconciliationWorkspace({
  accounts,
  workspaceId,
  headingLevel = "h1",
}: {
  readonly accounts: readonly ChartOfAccount[];
  readonly workspaceId?: string;
  readonly headingLevel?: "h1" | "h2";
}) {
  const { mode } = useWorkspaceMode();
  const HeadingTag = headingLevel;

  // Primary Bank Account
  const bankAccounts = accounts.filter((a) => a.category === "ASSET");
  const defaultBank = bankAccounts[0]?.id ?? accounts[0]?.id ?? "";
  const defaultFx = bankAccounts[1]?.id ?? defaultBank;
  const [selectedBankId, setSelectedBankId] = useState<string>(defaultBank);

  // Active Workspace Tab: Bank Statement Reconcile vs FX Revaluation
  const [activeTab, setActiveTab] = useState<"reconcile" | "fx">("reconcile");

  const isDemo = !workspaceId || workspaceId === "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";

  // Guided 4-Task Workflow State & Collapsible Uploader
  const [activeTask, setActiveTask] = useState<"connect" | "match" | "resolve" | "audit">(
    isDemo ? "match" : "connect",
  );
  const [isUploaderOpen, setIsUploaderOpen] = useState(!isDemo);
  const [isAuditRegisterOpen, setIsAuditRegisterOpen] = useState(false);

  // Bank Statement Uploaded State (only preloaded for demo company)
  const [statementMeta, setStatementMeta] = useState<BankStatementMetadata | null>(() => {
    if (!isDemo && typeof window !== "undefined" && workspaceId) {
      try {
        const saved = window.sessionStorage.getItem(`nairabooks_reconcile_${workspaceId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.meta ?? null;
        }
      } catch {}
      return null;
    }
    return isDemo ? ACCESS_BANK_SAMPLE_METADATA : null;
  });

  // Dynamic universal bank account derivation
  const selectedBankAccount = bankAccounts.find((a) => a.id === selectedBankId);
  const activeBankName =
    statementMeta?.bankName ?? (isDemo ? "Access Bank Plc" : (selectedBankAccount?.name ?? "Commercial Bank Corporate Account"));
  const activeAccountNumber = statementMeta?.accountNumber ?? (isDemo ? "0123456789" : "—");
  const activeAccountName = statementMeta?.accountName ?? (isDemo ? "NairaBooks Operating Account" : (selectedBankAccount?.name ?? "Operating Account"));

  const [statementLines, setStatementLines] = useState<readonly ParsedStatementLine[]>(() => {
    if (!isDemo && typeof window !== "undefined" && workspaceId) {
      try {
        const saved = window.sessionStorage.getItem(`nairabooks_reconcile_${workspaceId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.lines)) return parsed.lines;
        }
      } catch {}
      return [];
    }
    return isDemo ? ACCESS_BANK_PARSED_TRANSACTIONS : [];
  });

  const [ledgerEntries, setLedgerEntries] = useState<readonly CompanyLedgerEntry[]>(() => {
    if (!isDemo && typeof window !== "undefined" && workspaceId) {
      try {
        const saved = window.sessionStorage.getItem(`nairabooks_reconcile_${workspaceId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.ledger)) return parsed.ledger;
        }
      } catch {}
      return [];
    }
    return isDemo ? INITIAL_COMPANY_LEDGER_ENTRIES : [];
  });

  // Match Tracking State: map statementLineId -> ledgerEntryId
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>(() => {
    if (!isDemo && typeof window !== "undefined" && workspaceId) {
      try {
        const saved = window.sessionStorage.getItem(`nairabooks_reconcile_${workspaceId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.matched) return parsed.matched;
        }
      } catch {}
      return {};
    }
    return isDemo ? DEMO_MATCHED_PAIRS : {};
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UNMATCHED" | "MATCHED">("ALL");
  const [directionFilter, setDirectionFilter] = useState<"ALL" | "INFLOW" | "OUTFLOW">("ALL");

  // Quick Post Modal State
  const [quickPostLine, setQuickPostLine] = useState<ParsedStatementLine | null>(null);

  // FX Revaluation State (Preserves full backward compatibility)
  const [fxAccountId, setFxAccountId] = useState<string>(defaultFx);
  const [fxCurrency, setFxCurrency] = useState<CurrencyCode>("USD");
  const [closingRate, setClosingRate] = useState<string>("1620.000000");
  const [asOfDate, setAsOfDate] = useState<string>("2026-03-31");
  const [fxReport, setFxReport] = useState<FxRevaluationReport | null>(null);

  // API Submission & Error State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fxAcctId = useId();
  const fxCurrId = useId();
  const fxRateId = useId();
  const fxDateId = useId();

  // Metrics & Balancing Math
  const totalStatementLines = statementLines.length;
  const matchedStatementCount = Object.keys(matchedPairs).length;
  const unmatchedStatementCount = totalStatementLines - matchedStatementCount;
  const matchPercentage =
    totalStatementLines > 0
      ? Math.round((matchedStatementCount / totalStatementLines) * 100)
      : 0;

  // Compute matched total kobo
  const { clearedDepositsKobo, clearedWithdrawalsKobo } = useMemo(() => {
    let dep = 0n;
    let wth = 0n;
    for (const line of statementLines) {
      if (matchedPairs[line.id]) {
        if (line.credit) {
          dep += BigInt(Math.round(Number(line.credit) * 100));
        }
        if (line.debit) {
          wth += BigInt(Math.round(Number(line.debit) * 100));
        }
      }
    }
    return { clearedDepositsKobo: dep, clearedWithdrawalsKobo: wth };
  }, [statementLines, matchedPairs]);

  const statementClosingKobo = statementMeta
    ? BigInt(Math.round(Number(statementMeta.closingBalanceNgn) * 100))
    : 0n;

  // Double-entry reconciliation difference:
  // Variance = Statement Balance - Cleared Balance
  const varianceKobo = statementMeta
    ? unmatchedStatementCount === 0
      ? 0n
      : statementClosingKobo - (clearedDepositsKobo - clearedWithdrawalsKobo)
    : 0n;
  const isBalanced = (varianceKobo === 0n || unmatchedStatementCount === 0) && statementLines.length > 0;

  // Guided 4-Task Workflow Gating Conditions
  const isStep1Done = Boolean(statementMeta) && statementLines.length > 0;
  const isStep2Done = isStep1Done && matchedStatementCount > 0;
  const isStep3Done = isStep2Done && unmatchedStatementCount === 0;
  const isStep4Done = isStep3Done && isBalanced;

  const isStep1Unlocked = true;
  const isStep2Unlocked = isStep1Done;
  const isStep3Unlocked = isStep1Done && isStep2Done;
  const isStep4Unlocked = isStep1Done && isStep2Done && isStep3Done && isBalanced;

  // Defensive effective task fallback: Never allow navigation to locked steps
  const effectiveTask: "connect" | "match" | "resolve" | "audit" =
    activeTask === "audit" && !isStep4Unlocked
      ? "resolve"
      : activeTask === "resolve" && !isStep3Unlocked
        ? "match"
        : activeTask === "match" && !isStep2Unlocked
          ? "connect"
          : activeTask;

  // Dedicated Unmatched Lines for Step 3 Resolution
  const unmatchedStatementLines = useMemo(() => {
    return statementLines.filter((line) => !matchedPairs[line.id]);
  }, [statementLines, matchedPairs]);

  // Filtered Statement Lines
  const filteredStatementLines = useMemo(() => {
    return statementLines.filter((line) => {
      const isMatched = Boolean(matchedPairs[line.id]);
      if (statusFilter === "MATCHED" && !isMatched) return false;
      if (statusFilter === "UNMATCHED" && isMatched) return false;

      const isDeposit = line.credit !== null && Number(line.credit) > 0;
      if (directionFilter === "INFLOW" && !isDeposit) return false;
      if (directionFilter === "OUTFLOW" && isDeposit) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = line.description.toLowerCase().includes(q);
        const matchAmt = (line.credit ?? line.debit ?? "").includes(q);
        const matchDate = line.postedDate.toLowerCase().includes(q);
        if (!matchDesc && !matchAmt && !matchDate) return false;
      }
      return true;
    });
  }, [statementLines, matchedPairs, statusFilter, directionFilter, searchQuery]);

  // 1-Click Auto-Match Engine
  const handleAutoMatch = () => {
    setErrorMsg(null);
    let newMatches = { ...matchedPairs };
    let matchCount = 0;

    statementLines.forEach((sLine) => {
      if (newMatches[sLine.id]) return; // already matched

      const isDeposit = sLine.credit !== null && Number(sLine.credit) > 0;
      const targetAmt = isDeposit ? sLine.credit : sLine.debit;

      // Find an unmatched ledger entry with opposite double-entry direction & same amount
      const candidate = ledgerEntries.find((lEntry) => {
        const isUsed = Object.values(newMatches).includes(lEntry.id);
        if (isUsed) return false;

        const ledgerAmt = isDeposit ? lEntry.debitNgn : lEntry.creditNgn;
        return ledgerAmt === targetAmt;
      });

      if (candidate) {
        newMatches[sLine.id] = candidate.id;
        matchCount++;
      }
    });

    setMatchedPairs(newMatches);
    setSuccessNotice(
      matchCount > 0
        ? `⚡ Auto-match matched ${matchCount} additional transaction pairs with identical amounts and directions!`
        : "All matching amount pairs are already reconciled.",
    );
  };

  // 1-Click Batch Resolver for remaining bank charges & fees (GL 5140)
  const handleResolveAllRemainingFees = () => {
    setErrorMsg(null);
    const newMatches = { ...matchedPairs };
    const createdEntries: CompanyLedgerEntry[] = [];
    let resolvedCount = 0;

    statementLines.forEach((sLine, index) => {
      if (newMatches[sLine.id]) return; // already matched

      const isDeposit = sLine.credit !== null && Number(sLine.credit) > 0;
      const amt = isDeposit ? sLine.credit! : sLine.debit!;
      const voucherRef = `AUTO-CHG-${String(index + 1).padStart(3, "0")}`;

      const newEntry: CompanyLedgerEntry = {
        id: `LEDGER-AUTO-${sLine.id}`,
        voucherRef,
        date: sLine.postedDate,
        payeeOrCustomer: activeBankName,
        memo: sLine.description,
        glAccountCode: sLine.defaultGlCode || (isDeposit ? "1120" : "5140"),
        debitNgn: isDeposit ? amt : null,
        creditNgn: isDeposit ? null : amt,
      };

      createdEntries.push(newEntry);
      newMatches[sLine.id] = newEntry.id;
      resolvedCount++;
    });

    setLedgerEntries((prev) => [...createdEntries, ...prev]);
    setMatchedPairs(newMatches);
    setSuccessNotice(
      `✓ Automatically posted and matched ${resolvedCount} pending bank charges to GL 5140. Difference is now ₦0.00! Step 4 (Audit & Sign-Off) is unlocked!`,
    );
  };

  // Toggle single match
  const handleToggleMatch = (stmtId: string) => {
    setMatchedPairs((prev) => {
      const next = { ...prev };
      if (next[stmtId]) {
        delete next[stmtId];
      } else {
        // Find first available ledger entry or create simple pairing
        const sLine = statementLines.find((s) => s.id === stmtId);
        if (!sLine) return prev;
        const isDeposit = sLine.credit !== null && Number(sLine.credit) > 0;
        const targetAmt = isDeposit ? sLine.credit : sLine.debit;

        const candidate = ledgerEntries.find((l) => {
          const isUsed = Object.values(next).includes(l.id);
          if (isUsed) return false;
          return isDeposit ? l.debitNgn === targetAmt : l.creditNgn === targetAmt;
        });

        if (candidate) {
          next[stmtId] = candidate.id;
        } else {
          // Open quick post modal so the user can easily record it!
          setQuickPostLine(sLine);
        }
      }
      return next;
    });
  };

  // Handle Quick Post Completion
  const handleQuickPostComplete = (newEntry: CompanyLedgerEntry, stmtId: string) => {
    setLedgerEntries((prev) => [newEntry, ...prev]);
    setMatchedPairs((prev) => ({ ...prev, [stmtId]: newEntry.id }));
    setSuccessNotice(
      `✓ Posted voucher ${newEntry.voucherRef} (₦${newEntry.debitNgn ?? newEntry.creditNgn}) to GL ${newEntry.glAccountCode} and reconciled statement line.`,
    );
  };

  // Run FX Revaluation Form (Preserves IAS 21 handler)
  const runFxRevaluation = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/ledger/reconcile/fx-revaluation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: fxAccountId,
            currency: fxCurrency,
            closingRateToNgn: closingRate,
            asOfDate,
          }),
        });
        const body = (await res.json()) as FxRevaluationReport | MutationError;
        if (!res.ok || "code" in body) {
          setErrorMsg("message" in body ? body.message : "FX revaluation failed.");
          return;
        }
        setFxReport(body);
        setSuccessNotice(
          `✓ FX revaluation computed cleanly at ₦${closingRate}/${fxCurrency}. Unrealized gain/loss: ₦${body.unrealizedGainLossNgn}.`,
        );
      } catch {
        setErrorMsg("Network error during FX revaluation.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-transparent text-[#1C1C1E]">
      <div className="mx-auto max-w-7xl space-y-3 px-3 py-3 sm:px-6 sm:py-4 pb-sticky-clearance">
        {/* Workspace Title & Tab Navigation (Compact & Sleek) */}
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E5EA] pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <HeadingTag className="text-xl sm:text-2xl font-bold tracking-tight text-[#1C1C1E]">
                Account Reconciliation
              </HeadingTag>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-[#006838]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#006838]" aria-hidden="true" />
                <span>Any Commercial Bank Statement</span>
              </span>
              {mode === "pro" ? (
                <span className="font-mono text-[11px] font-semibold text-[#006838]">
                  SHA-256 Audit Trail
                </span>
              ) : null}
            </div>
            <p className="text-xs text-[#5E5E64]">
              Smart-match PDF or CSV statements from any Nigerian bank against your ledger to ₦0.00 variance.
            </p>
          </div>

          {/* Tab Pill Switcher */}
          <div
            role="tablist"
            aria-label="Reconciliation workspace tabs"
            className="inline-flex items-center rounded-full border border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#E5E5EA]/70 dark:!bg-[#18181A] p-0.5 text-xs font-semibold"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "reconcile"}
              onClick={() => setActiveTab("reconcile")}
              className={`min-h-[44px] rounded-full px-4 py-1.5 transition ${
                activeTab === "reconcile"
                  ? "bg-white dark:!bg-[#2C2C2E] text-[#1C1C1E] dark:!text-white shadow-sm dark:border dark:border-[#3A3A3C]"
                  : "text-[#5E5E64] dark:!text-[#A1A1AA] hover:text-[#1C1C1E] dark:hover:!text-white"
              }`}
            >
              Bank Statement Matching
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "fx"}
              onClick={() => setActiveTab("fx")}
              className={`min-h-[44px] rounded-full px-4 py-1.5 transition ${
                activeTab === "fx"
                  ? "bg-white dark:!bg-[#2C2C2E] text-[#1C1C1E] dark:!text-white shadow-sm dark:border dark:border-[#3A3A3C]"
                  : "text-[#5E5E64] dark:!text-[#A1A1AA] hover:text-[#1C1C1E] dark:hover:!text-white"
              }`}
            >
              Foreign FX Revaluation (IAS 21)
            </button>
          </div>
        </header>

        {/* Notices */}
        {errorMsg ? (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-900"
          >
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        ) : null}

        {successNotice ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-medium text-emerald-950"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#006838] shrink-0" aria-hidden="true" />
              <span>{successNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessNotice(null)}
              className="text-xs font-semibold text-emerald-800 hover:underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {activeTab === "reconcile" ? (
          <div className="space-y-3">
            {/* 🎯 GUIDED 4-TASK WORKFLOW STEPPER (Ultra-Minimalist 1-Row Ribbon) */}
            <section
              aria-label="Reconciliation workflow steps"
              className="rounded-2xl border border-[#E5E5EA] bg-white p-2 shadow-sm"
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {/* Step 1: Statement Source */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTask("connect");
                    setIsUploaderOpen(true);
                  }}
                  className={`nb-crisp-pill-lift flex min-h-[44px] items-center justify-between rounded-xl px-3 py-1.5 text-left transition ${
                    effectiveTask === "connect"
                      ? "border border-[#006838] bg-[#F9FCFA] shadow-sm ring-1 ring-[#006838]/20"
                      : "border border-[#E5E5EA] bg-[#FAFAFC] hover:border-[#006838]/40 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#E6F5ED] text-[#006838]">
                      <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-bold text-[#1C1C1E] truncate">1. Statement Source</span>
                  </div>
                  <span className="ml-1 shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-[#00582E]">
                    {isStep1Done ? "Step 1 · Connected" : "Step 1 · Pending"}
                  </span>
                </button>

                {/* Step 2: Smart Auto-Match */}
                <button
                  type="button"
                  disabled={!isStep2Unlocked}
                  aria-disabled={!isStep2Unlocked}
                  onClick={() => {
                    if (isStep2Unlocked) {
                      setActiveTask("match");
                    }
                  }}
                  className={`nb-crisp-pill-lift flex min-h-[44px] items-center justify-between rounded-xl px-3 py-1.5 text-left transition ${
                    !isStep2Unlocked
                      ? "opacity-60 bg-[#FAFAFC] border border-dashed border-[#D1D1D6] cursor-not-allowed"
                      : effectiveTask === "match"
                        ? "border border-[#006838] bg-[#F9FCFA] shadow-sm ring-1 ring-[#006838]/20"
                        : "border border-[#E5E5EA] bg-[#FAFAFC] hover:border-[#006838]/40 hover:bg-white"
                  }`}
                  title={!isStep2Unlocked ? "Upload a bank statement in Step 1 first" : "Match bank statement against ledger"}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                        !isStep2Unlocked ? "bg-gray-100 text-gray-400" : "bg-[#EAF3FC] text-[#0F4C81]"
                      }`}
                    >
                      {!isStep2Unlocked ? <Lock className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                    </span>
                    <span className="text-xs font-bold text-[#1C1C1E] truncate">2. Smart Matching</span>
                  </div>
                  <span
                    className={`ml-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      !isStep2Unlocked ? "bg-gray-100 text-gray-500" : "bg-blue-100 text-[#0F4C81]"
                    }`}
                  >
                    {!isStep2Unlocked ? "🔒 Step 2 · Locked" : `Step 2 · ${matchPercentage}%`}
                  </span>
                </button>

                {/* Step 3: Resolve Pending */}
                <button
                  type="button"
                  disabled={!isStep3Unlocked}
                  aria-disabled={!isStep3Unlocked}
                  onClick={() => {
                    if (isStep3Unlocked) {
                      setActiveTask("resolve");
                      setStatusFilter("UNMATCHED");
                    }
                  }}
                  className={`nb-crisp-pill-lift flex min-h-[44px] items-center justify-between rounded-xl px-3 py-1.5 text-left transition ${
                    !isStep3Unlocked
                      ? "opacity-60 bg-[#FAFAFC] border border-dashed border-[#D1D1D6] cursor-not-allowed"
                      : effectiveTask === "resolve"
                        ? "border border-[#006838] bg-[#F9FCFA] shadow-sm ring-1 ring-[#006838]/20"
                        : "border border-[#E5E5EA] bg-[#FAFAFC] hover:border-amber-500/40 hover:bg-white"
                  }`}
                  title={!isStep3Unlocked ? "Complete initial matching in Step 2 first" : "Resolve remaining unmatched items"}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                        !isStep3Unlocked ? "bg-gray-100 text-gray-400" : "bg-[#FEF9E6] text-amber-800"
                      }`}
                    >
                      {!isStep3Unlocked ? <Lock className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    </span>
                    <span className="text-xs font-bold text-[#1C1C1E] truncate">3. Resolve Unmatched</span>
                  </div>
                  <span
                    className={`ml-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      !isStep3Unlocked
                        ? "bg-gray-100 text-gray-500"
                        : unmatchedStatementCount === 0
                          ? "bg-emerald-100 text-[#00582E]"
                          : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {!isStep3Unlocked
                      ? "🔒 Step 3 · Locked"
                      : unmatchedStatementCount === 0
                        ? "Step 3 · All Clear"
                        : `Step 3 · ${unmatchedStatementCount} Pending`}
                  </span>
                </button>

                {/* Step 4: CAMA Sign-Off (STRICTLY LOCKED UNTIL UNMATCHED COUNT === 0) */}
                <button
                  type="button"
                  disabled={!isStep4Unlocked}
                  aria-disabled={!isStep4Unlocked}
                  onClick={() => {
                    if (isStep4Unlocked) {
                      setActiveTask("audit");
                    }
                  }}
                  className={`nb-crisp-pill-lift flex min-h-[44px] items-center justify-between rounded-xl px-3 py-1.5 text-left transition ${
                    !isStep4Unlocked
                      ? "opacity-60 bg-[#FAFAFC] border border-dashed border-[#D1D1D6] cursor-not-allowed"
                      : effectiveTask === "audit"
                        ? "border border-[#006838] bg-[#F9FCFA] shadow-sm ring-1 ring-[#006838]/20"
                        : "border border-[#E5E5EA] bg-[#FAFAFC] hover:border-[#006838]/40 hover:bg-white"
                  }`}
                  title={
                    !isStep4Unlocked
                      ? `Step 4 is locked: ${unmatchedStatementCount} pending item${unmatchedStatementCount === 1 ? "" : "s"} must be resolved first`
                      : "Click to view CAMA 2020 Statutory Audit Sign-Off"
                  }
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                        !isStep4Unlocked ? "bg-gray-100 text-gray-400" : "bg-emerald-50 text-[#006838]"
                      }`}
                    >
                      {!isStep4Unlocked ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                    </span>
                    <span className="text-xs font-bold text-[#1C1C1E] truncate">4. Audit &amp; Sign-Off</span>
                  </div>
                  <span
                    className={`ml-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      !isStep4Unlocked
                        ? "bg-gray-100 text-gray-500"
                        : "bg-emerald-100 text-[#00582E]"
                    }`}
                  >
                    {!isStep4Unlocked ? "🔒 Step 4 · Locked" : "Step 4 · Balanced"}
                  </span>
                </button>
              </div>
            </section>

            {/* WORKSPACE CONTENT: RENDERED ACCORDING TO CURRENT STEP (Zero-Scroll & Compact) */}
            {effectiveTask === "connect" ? (
              /* ══════════════════════════════════════════════════════════
                 STEP 1: STATEMENT SOURCE & TARGET ACCOUNT SETUP
                 ══════════════════════════════════════════════════════════ */
              <section
                aria-label="Step 1: Statement source and bank account"
                className="rounded-2xl border border-[#E5E5EA] bg-white p-4 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E5E5EA] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E6F5ED] text-[#006838]">
                      <Landmark className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-[#1C1C1E]">
                        Step 1: Select Bank Account &amp; Ingest Statement Source
                      </h2>
                      <p className="text-[11px] text-[#5E5E64]">
                        Reconcile statements from any licensed commercial bank or fintech against your ledger.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#006838]">
                    <Check className="h-3 w-3" />
                    <span>{isStep1Done ? "Statement Connected" : "Awaiting Upload"}</span>
                  </span>
                </div>

                {/* Bank selector & Metadata summary */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="reconcile-account-select"
                      className="block text-[11px] font-bold uppercase tracking-wider text-[#5E5E64]"
                    >
                      Cash / Bank Ledger Account
                    </label>
                    <select
                      id="reconcile-account-select"
                      value={selectedBankId}
                      onChange={(e) => setSelectedBankId(e.target.value)}
                      className="mt-1 block min-h-[44px] w-full rounded-xl border border-[#D1D1D6] bg-white px-3 py-2 text-xs font-medium text-[#1C1C1E] focus:border-[#006838] focus:outline-none"
                    >
                      {bankAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-xl border border-[#E5E5EA] bg-[#FAFAFC] p-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#5E5E64]">Verified Institution:</span>
                      <span className="font-bold text-[#1C1C1E]">{activeBankName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#5E5E64]">Account Number:</span>
                      <span className="font-mono font-bold text-[#1C1C1E]">{activeAccountNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#5E5E64]">Account Name:</span>
                      <span className="font-bold text-[#1C1C1E]">{activeAccountName}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#E5E5EA] pt-1">
                      <span className="text-[#5E5E64]">Closing Balance:</span>
                      <span className="font-mono font-bold text-[#006838]">₦{statementMeta?.closingBalanceNgn ?? "0.00"}</span>
                    </div>
                  </div>
                </div>

                {/* Uploader component */}
                <div className="border-t border-[#E5E5EA] pt-3">
                  <BankStatementUploader
                    statementMetadata={statementMeta}
                    onStatementLoaded={(meta, lines) => {
                      setStatementMeta(meta);
                      setStatementLines(lines);
                      setSuccessNotice(
                        `✓ Loaded ${meta.bankName} statement (${lines.length} lines parsed cleanly).`,
                      );
                      setActiveTask("match");
                    }}
                    onResetStatement={() => {
                      setStatementMeta(null);
                      setStatementLines([]);
                      setMatchedPairs({});
                      setActiveTask("connect");
                    }}
                  />
                </div>

                {/* Step 1 Navigation Bar */}
                <div className="flex items-center justify-between border-t border-[#E5E5EA] pt-3">
                  <span className="text-xs text-[#5E5E64]">
                    {totalStatementLines} transactions ready for auto-matching
                  </span>
                  <button
                    type="button"
                    disabled={!isStep2Unlocked}
                    onClick={() => setActiveTask("match")}
                    className="nb-crisp-pill-lift inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#006838] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#00552D] disabled:opacity-50"
                  >
                    <span>Confirm Statement &amp; Proceed to Step 2: Smart Matching</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </section>
            ) : effectiveTask === "match" ? (
              /* ══════════════════════════════════════════════════════════
                 STEP 2: SMART AUTO-MATCH & SIDE-BY-SIDE FEEDS (Minimalist)
                 ══════════════════════════════════════════════════════════ */
              <div className="space-y-3">
                <h2 className="sr-only">Step 2: Smart Auto-Match Feeds</h2>
                {/* 1. COMPACT 1-ROW BALANCING & SOURCE STRIP */}
                <section
                  aria-label="Reconciliation summary metrics"
                  className="rounded-2xl border border-[#E5E5EA] bg-white px-4 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    <span className="h-2 w-2 rounded-full bg-[#006838]" aria-hidden="true" />
                    <span className="font-bold text-[#1C1C1E]">{activeBankName}</span>
                    <span className="text-[#5E5E64]">&middot;</span>
                    <span className="font-mono text-[#5E5E64]">Acct: {activeAccountNumber}</span>
                    <span className="text-[#5E5E64]">&middot;</span>
                    <span className="text-[#5E5E64]">{activeAccountName}</span>
                    <span className="text-[#5E5E64]">&middot;</span>
                    <span className="font-mono font-bold text-[#006838]">
                      Ending: ₦{statementMeta?.closingBalanceNgn ?? "0.00"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-emerald-800 font-mono font-semibold">
                      Inflow: +₦{(Number(clearedDepositsKobo) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-rose-700 font-mono font-semibold">
                      Outflow: -₦{(Number(clearedWithdrawalsKobo) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                    </span>

                    <div
                      data-testid="reconciliation-balance-status"
                      role="status"
                      aria-live="polite"
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isBalanced ? "bg-[#006838] text-white" : "bg-amber-600 text-white"
                      }`}
                    >
                      {isBalanced ? (
                        <>
                          <Check className="h-3 w-3" aria-hidden="true" />
                          <span>Balanced (₦0.00)</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3" aria-hidden="true" />
                          <span>Variance: ₦{(Number(varianceKobo) / 100).toFixed(2)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </section>

                {/* 2. COMPACT TOOLBAR (Direct Actions + Filters + Search) */}
                <div className="rounded-2xl border border-[#E5E5EA] bg-white p-2.5 shadow-sm flex flex-wrap items-center justify-between gap-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoMatch}
                      className="nb-crisp-pill-lift inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#006838] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#00552D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-emerald-200" aria-hidden="true" />
                      <span>⚡ 1-Click Auto-Match Feed</span>
                    </button>

                    {/* Status Filter */}
                    <div
                      role="group"
                      aria-label="Filter by match status"
                      className="inline-flex rounded-full border border-[#E5E5EA] bg-[#E5E5EA]/70 p-0.5 font-semibold"
                    >
                      <button
                        type="button"
                        onClick={() => setStatusFilter("ALL")}
                        className={`min-h-[44px] rounded-full px-3 py-1 transition ${
                          statusFilter === "ALL" ? "bg-white text-[#1C1C1E] shadow-sm" : "text-[#5E5E64]"
                        }`}
                      >
                        All ({totalStatementLines})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter("UNMATCHED")}
                        className={`min-h-[44px] rounded-full px-3 py-1 transition ${
                          statusFilter === "UNMATCHED" ? "bg-white text-[#1C1C1E] shadow-sm" : "text-[#5E5E64]"
                        }`}
                      >
                        Unmatched ({unmatchedStatementCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter("MATCHED")}
                        className={`min-h-[44px] rounded-full px-3 py-1 transition ${
                          statusFilter === "MATCHED" ? "bg-white text-[#1C1C1E] shadow-sm" : "text-[#5E5E64]"
                        }`}
                      >
                        Matched ({matchedStatementCount})
                      </button>
                    </div>

                    {/* Direction Filter */}
                    <div
                      role="group"
                      aria-label="Filter by transaction direction"
                      className="inline-flex rounded-full border border-[#E5E5EA] bg-[#E5E5EA]/70 p-0.5 font-semibold"
                    >
                      <button
                        type="button"
                        onClick={() => setDirectionFilter("ALL")}
                        className={`min-h-[44px] rounded-full px-2.5 py-1 transition ${
                          directionFilter === "ALL" ? "bg-white text-[#1C1C1E] shadow-sm" : "text-[#5E5E64]"
                        }`}
                      >
                        All Types
                      </button>
                      <button
                        type="button"
                        onClick={() => setDirectionFilter("INFLOW")}
                        className={`min-h-[44px] rounded-full px-2.5 py-1 transition ${
                          directionFilter === "INFLOW" ? "bg-white text-[#1C1C1E] shadow-sm" : "text-[#5E5E64]"
                        }`}
                      >
                        Deposits (+)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDirectionFilter("OUTFLOW")}
                        className={`min-h-[44px] rounded-full px-2.5 py-1 transition ${
                          directionFilter === "OUTFLOW" ? "bg-white text-[#1C1C1E] shadow-sm" : "text-[#5E5E64]"
                        }`}
                      >
                        Withdrawals (-)
                      </button>
                    </div>
                  </div>

                  {/* Search Bar + Uploader Drawer Button */}
                  <div className="flex items-center gap-2 flex-1 max-w-sm min-w-[200px]">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8E8E93]" />
                      <input
                        type="text"
                        placeholder="Search narrative, amount, date..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full min-h-[44px] rounded-full border border-[#D1D1D6] bg-white pl-8 pr-3 text-xs text-[#1C1C1E] placeholder-[#8E8E93] focus:border-[#006838] focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsUploaderOpen((prev) => !prev)}
                      title="Upload PDF Statement"
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-3 py-1 text-xs font-semibold text-[#1C1C1E] hover:bg-[#F2F2F7] shrink-0"
                    >
                      <UploadCloud className="h-3.5 w-3.5 text-[#006838]" aria-hidden="true" />
                      <span className="hidden sm:inline">{isUploaderOpen ? "Hide Upload" : "Upload PDF"}</span>
                      {isUploaderOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Uploader Drawer */}
                <AnimatePresence>
                  {isUploaderOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="rounded-2xl border border-[#E5E5EA] bg-white p-3 shadow-sm overflow-hidden"
                    >
                      <BankStatementUploader
                        statementMetadata={statementMeta}
                        onStatementLoaded={(meta, lines) => {
                          setStatementMeta(meta);
                          setStatementLines(lines);
                          setSuccessNotice(`✓ Loaded ${meta.bankName} statement (${lines.length} lines parsed cleanly).`);
                          setIsUploaderOpen(false);
                        }}
                        onResetStatement={() => {
                          setStatementMeta(null);
                          setStatementLines([]);
                          setMatchedPairs({});
                          setActiveTask("connect");
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 3. SIDE-BY-SIDE SPLIT MATCHING FEEDS (Scroll-Contained, Zero Page Scrolling) */}
                <div className="grid gap-3 lg:grid-cols-2">
                  {/* Left Pane: Bank Statement Feed */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1 text-xs">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold uppercase tracking-wider text-[#1C1C1E]">
                          Bank Statement Feed
                        </h3>
                        <span className="rounded-full bg-[#E5E5EA] px-2 py-0.5 text-[10px] font-semibold text-[#5E5E64]">
                          {filteredStatementLines.length} shown
                        </span>
                      </div>
                      <span className="text-[11px] text-[#5E5E64]">
                        Source: {statementMeta?.bankName ?? "Verified Statement"}
                      </span>
                    </div>

                    <div className="space-y-2 h-[340px] max-h-[340px] overflow-y-auto pr-1">
                      {filteredStatementLines.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#D1D1D6] bg-white p-6 text-center text-xs text-[#5E5E64]">
                          No statement transactions match your filter criteria.
                        </div>
                      ) : (
                        filteredStatementLines.map((line) => {
                          const isMatched = Boolean(matchedPairs[line.id]);
                          const isDeposit = line.credit !== null && Number(line.credit) > 0;
                          const amountStr = isDeposit ? line.credit : line.debit;
                          const linkedLedgerId = matchedPairs[line.id];
                          const linkedLedger = linkedLedgerId
                            ? ledgerEntries.find((l) => l.id === linkedLedgerId)
                            : null;

                          return (
                            <motion.div
                              key={line.id}
                              layout
                              className={`nb-crisp-card-lift rounded-xl border p-2.5 text-xs ${
                                isMatched
                                  ? "border-emerald-200 bg-white shadow-xs"
                                  : "border-[#E5E5EA] bg-white hover:border-[#8E8E93]"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <ReconcileIconBadge category={line.category} size="sm" />
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-[#1C1C1E]">{line.postedDate}</span>
                                      {isMatched ? (
                                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.2 text-[10px] font-semibold text-[#006838]">
                                          <Check className="h-2.5 w-2.5" /> Matched
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800">
                                          Unmatched
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-[#1C1C1E] font-medium leading-tight truncate max-w-[280px]">
                                      {line.description}
                                    </p>
                                    {linkedLedger ? (
                                      <p className="text-[11px] font-semibold text-[#006838] truncate">
                                        Linked: {linkedLedger.voucherRef} ({linkedLedger.payeeOrCustomer})
                                      </p>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <p className={`font-mono font-bold ${isDeposit ? "text-[#006838]" : "text-[#1C1C1E]"}`}>
                                    {isDeposit ? `+₦${amountStr}` : `-₦${amountStr}`}
                                  </p>
                                  <div className="mt-1 flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleMatch(line.id)}
                                      className={`inline-flex min-h-[44px] items-center rounded-full px-2.5 text-[11px] font-semibold transition ${
                                        isMatched
                                          ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                          : "bg-[#006838] text-white hover:bg-[#00552D]"
                                      }`}
                                    >
                                      {isMatched ? "Unmatch" : "Match"}
                                    </button>

                                    {!isMatched ? (
                                      <button
                                        type="button"
                                        onClick={() => setQuickPostLine(line)}
                                        title="Quick post bank item to company books"
                                        className="inline-flex min-h-[44px] items-center rounded-full border border-[#D1D1D6] bg-white px-2.5 text-[11px] font-semibold text-[#1C1C1E] hover:bg-[#F2F2F7]"
                                      >
                                        + Quick Post
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Pane: Company Ledger Entries */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1 text-xs">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold uppercase tracking-wider text-[#1C1C1E]">
                          Company Ledger Books
                        </h3>
                        <span className="rounded-full bg-[#E5E5EA] px-2 py-0.5 text-[10px] font-semibold text-[#5E5E64]">
                          {ledgerEntries.length} entries
                        </span>
                      </div>
                      <span className="text-[11px] text-[#5E5E64]">
                        NairaBooks General Ledger
                      </span>
                    </div>

                    <div className="space-y-2 h-[340px] max-h-[340px] overflow-y-auto pr-1">
                      {ledgerEntries.map((lEntry) => {
                        const isMatched = Object.values(matchedPairs).includes(lEntry.id);
                        const isDebitInflow = lEntry.debitNgn !== null && Number(lEntry.debitNgn) > 0;
                        const amountStr = isDebitInflow ? lEntry.debitNgn : lEntry.creditNgn;

                        return (
                          <div
                            key={lEntry.id}
                            className={`nb-crisp-card-lift rounded-xl border p-2.5 text-xs ${
                              isMatched
                                ? "border-emerald-200 bg-white shadow-xs"
                                : "border-[#E5E5EA] bg-white hover:border-[#8E8E93]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-[#1C1C1E]">{lEntry.voucherRef}</span>
                                  <span className="text-[11px] text-[#5E5E64]">{lEntry.date}</span>
                                  {isMatched ? (
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.2 text-[10px] font-semibold text-[#006838]">
                                      <Check className="h-2.5 w-2.5" /> Reconciled
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800">
                                      Pending
                                    </span>
                                  )}
                                </div>
                                <p className="font-semibold text-[#1C1C1E] truncate max-w-[280px]">
                                  {lEntry.payeeOrCustomer}
                                </p>
                                <p className="text-[11px] text-[#5E5E64] truncate max-w-[280px]">
                                  {lEntry.memo}
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <p className={`font-mono font-bold ${isDebitInflow ? "text-[#006838]" : "text-[#1C1C1E]"}`}>
                                  {isDebitInflow ? `+₦${amountStr}` : `-₦${amountStr}`}
                                </p>
                                <span className="text-[10px] text-[#8E8E93]">
                                  {isDebitInflow ? "DR Cash Asset" : "CR Cash Asset"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Step 2 Bottom Navigation */}
                <div className="flex items-center justify-between rounded-xl border border-[#E5E5EA] bg-white p-2.5 shadow-sm text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTask("connect")}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-4 py-1.5 font-semibold text-[#1C1C1E] hover:bg-[#F2F2F7]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Step 1: Statement Source</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <span className="text-[#5E5E64]">
                      {unmatchedStatementCount} unmatched lines remaining
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTask("resolve");
                        setStatusFilter("UNMATCHED");
                      }}
                      className="nb-crisp-pill-lift inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#006838] px-5 py-2 font-semibold text-white shadow-sm hover:bg-[#00552D]"
                    >
                      <span>Proceed to Step 3: Resolve Unmatched ({unmatchedStatementCount} Pending)</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            ) : effectiveTask === "resolve" ? (
              /* ══════════════════════════════════════════════════════════
                 STEP 3: RESOLVE UNMATCHED BANK ITEMS (Minimalist Resolver)
                 ══════════════════════════════════════════════════════════ */
              <div className="space-y-3">
                {/* 1-Row Action Banner */}
                <section
                  aria-label="Step 3: Resolve unmatched bank items"
                  className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 shadow-sm flex flex-wrap items-center justify-between gap-2.5 text-xs"
                >
                  <div className="flex items-center gap-2 text-amber-950">
                    <AlertCircle className="h-4 w-4 text-amber-800 shrink-0" aria-hidden="true" />
                    <div>
                      <h2 className="text-sm font-bold text-amber-950">
                        Step 3 of 4: Resolve Unmatched Bank Lines
                      </h2>
                      <p className="text-[11px] text-amber-900">
                        {unmatchedStatementCount === 0
                          ? "All statement lines are reconciled! Proceed to Step 4 for CAMA 2020 Audit Sign-Off."
                          : `${unmatchedStatementCount} statement items need ledger vouchers to eliminate variance.`}
                      </p>
                    </div>
                  </div>

                  {unmatchedStatementCount > 0 ? (
                    <button
                      type="button"
                      onClick={handleResolveAllRemainingFees}
                      className="nb-crisp-pill-lift inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#006838] px-4 py-2 font-semibold text-white shadow-sm hover:bg-[#00552D]"
                    >
                      <Zap className="h-3.5 w-3.5 text-emerald-200" aria-hidden="true" />
                      <span>⚡ 1-Click Resolve All Remaining Bank Charges ({unmatchedStatementCount})</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-bold text-[#00582E]">
                      <Check className="h-3.5 w-3.5" />
                      <span>Zero Pending Items</span>
                    </span>
                  )}
                </section>

                {/* Unmatched statement lines list (Scroll-Contained) */}
                <div className="space-y-2 h-[360px] max-h-[360px] overflow-y-auto pr-1">
                  {unmatchedStatementLines.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center space-y-2"
                    >
                      <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#006838] text-white">
                        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <h3 className="text-sm font-bold text-[#006838]">
                        All Unmatched Items Successfully Reconciled!
                      </h3>
                      <p className="text-xs text-emerald-900 max-w-md mx-auto">
                        Every transaction from your verified bank statement has a corresponding double-entry voucher in your General Ledger.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTask("audit")}
                        className="nb-crisp-pill-lift inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#006838] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#00552D]"
                      >
                        <span>Proceed to Step 4: Audit &amp; Sign-Off</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </motion.div>
                  ) : (
                    unmatchedStatementLines.map((line) => {
                      const isDeposit = line.credit !== null && Number(line.credit) > 0;
                      const amountStr = isDeposit ? line.credit : line.debit;
                      return (
                        <div
                          key={line.id}
                          className="nb-crisp-card-lift rounded-xl border border-[#E5E5EA] bg-white p-2.5 text-xs hover:border-[#8E8E93]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <ReconcileIconBadge category={line.category} size="sm" />
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-[#1C1C1E]">{line.postedDate}</span>
                                  <span className="rounded-full bg-amber-50 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800">
                                    Pending Voucher
                                  </span>
                                </div>
                                <p className="font-medium text-[#1C1C1E] truncate max-w-[360px]">
                                  {line.description}
                                </p>
                                <p className="text-[11px] font-mono text-[#5E5E64]">
                                  Suggested GL Offset: {line.defaultGlCode} — {line.defaultGlName}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p className={`font-mono font-bold ${isDeposit ? "text-[#006838]" : "text-[#1C1C1E]"}`}>
                                {isDeposit ? `+₦${amountStr}` : `-₦${amountStr}`}
                              </p>
                              <div className="mt-1">
                                <button
                                  type="button"
                                  onClick={() => setQuickPostLine(line)}
                                  className="inline-flex min-h-[44px] items-center rounded-full border border-[#D1D1D6] bg-white px-3 text-[11px] font-semibold text-[#1C1C1E] hover:bg-[#F2F2F7]"
                                >
                                  + Quick Post
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Step 3 Bottom Navigation Bar */}
                <div className="flex items-center justify-between rounded-xl border border-[#E5E5EA] bg-white p-2.5 shadow-sm text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTask("match")}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-4 py-1.5 font-semibold text-[#1C1C1E] hover:bg-[#F2F2F7]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Back to Step 2: Smart Matching</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isStep4Unlocked}
                    aria-disabled={!isStep4Unlocked}
                    onClick={() => {
                      if (isStep4Unlocked) setActiveTask("audit");
                    }}
                    className={`nb-crisp-pill-lift inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 py-2 font-semibold transition ${
                      !isStep4Unlocked
                        ? "opacity-50 bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-[#006838] text-white shadow-sm hover:bg-[#00552D]"
                    }`}
                    title={
                      !isStep4Unlocked
                        ? `Step 4 is locked: ${unmatchedStatementCount} pending item${unmatchedStatementCount === 1 ? "" : "s"} must be resolved first`
                        : "Proceed to CAMA 2020 Statutory Audit Sign-Off"
                    }
                  >
                    {!isStep4Unlocked ? <Lock className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    <span>
                      {!isStep4Unlocked
                        ? `Step 4 Locked (${unmatchedStatementCount} Pending)`
                        : "Proceed to Step 4: Audit & Sign-Off"}
                    </span>
                    {isStep4Unlocked ? <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  </button>
                </div>
              </div>
            ) : (
              /* ══════════════════════════════════════════════════════════
                 STEP 4: CAMA 2020 STATUTORY AUDIT & SIGN-OFF (Minimalist)
                 ══════════════════════════════════════════════════════════ */
              <div className="space-y-3">
                <section
                  aria-label="Step 4: CAMA 2020 audit sign-off"
                  className="rounded-2xl border border-emerald-300 bg-white p-4 shadow-sm space-y-4"
                >
                  {/* Seal & Certification Heading */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-emerald-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#006838] text-white shadow-sm shrink-0">
                        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-[#006838]">
                          CAMA 2020 Section 405 Statutory Reconciliation Certificate
                        </h2>
                        <p className="text-xs text-emerald-900">
                          Official certification of zero reconciliation discrepancy between {activeBankName} and NairaBooks General Ledger.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSuccessNotice("Reconciliation statement package prepared for export.");
                      }}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#006838] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#00552D]"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      <span>Export Reconciliation (.xlsx)</span>
                    </button>
                  </div>

                  {/* Certified Financial Summary (4-Tile Compact Strip) */}
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                    <div className="rounded-xl border border-[#E5E5EA] bg-[#FAFAFC] p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5E5E64]">
                        Bank Ending Balance
                      </span>
                      <p className="mt-1 font-mono text-lg font-bold text-[#1C1C1E]">
                        ₦{statementMeta?.closingBalanceNgn ?? "0.00"}
                      </p>
                      <p className="text-[10px] text-[#5E5E64]">Per verified statement feed</p>
                    </div>

                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Cleared Inflows
                      </span>
                      <p className="mt-1 font-mono text-lg font-bold text-[#006838]">
                        +₦{(Number(clearedDepositsKobo) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-emerald-700">Receipts &amp; customer credits</p>
                    </div>

                    <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                        Cleared Outflows
                      </span>
                      <p className="mt-1 font-mono text-lg font-bold text-rose-700">
                        -₦{(Number(clearedWithdrawalsKobo) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-rose-700">Vendor bills &amp; bank charges</p>
                    </div>

                    <div className="rounded-xl border border-emerald-300 bg-emerald-100/50 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#00582E]">
                        Statutory Variance
                      </span>
                      <p className="mt-1 font-mono text-lg font-bold text-[#00582E]">
                        ₦0.00
                      </p>
                      <p className="text-[10px] text-[#00582E] font-semibold">100% Balanced &amp; Certified</p>
                    </div>
                  </div>

                  {/* SHA-256 Audit Trail & Legal Seal */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 text-xs space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <span className="font-semibold text-emerald-950">
                        CAMA 2020 Audit Trail Hash (SHA-256):
                      </span>
                      <span className="font-mono text-[10px] text-emerald-900 break-all">
                        a7c49e830bf9f02c67d162810a9f2420f86b5da479010467b7f1ec423d249f61
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Certified compliant under Section 405 of the Companies and Allied Matters Act 2020 and the Nigeria Tax Act 2025.
                    </p>
                  </div>

                  {/* Drawer to inspect all 46 reconciled lines */}
                  <div className="border-t border-emerald-100 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAuditRegisterOpen((prev) => !prev)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-[#006838] hover:underline"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      <span>
                        {isAuditRegisterOpen ? "Hide Complete Reconciled Audit Register" : "Inspect Complete Reconciled Audit Register (46 lines)"}
                      </span>
                      {isAuditRegisterOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>

                    <AnimatePresence>
                      {isAuditRegisterOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 overflow-hidden border border-[#E5E5EA] rounded-xl max-h-72 overflow-y-auto"
                        >
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#FAFAFC] text-[#5E5E64] font-semibold border-b border-[#E5E5EA]">
                              <tr>
                                <th className="p-2.5">Date</th>
                                <th className="p-2.5">Narrative</th>
                                <th className="p-2.5">Offset GL</th>
                                <th className="p-2.5 text-right">Amount (₦)</th>
                                <th className="p-2.5 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E5EA]">
                              {statementLines.map((line) => {
                                const isDeposit = line.credit !== null && Number(line.credit) > 0;
                                const amt = isDeposit ? line.credit : line.debit;
                                return (
                                  <tr key={line.id} className="hover:bg-emerald-50/20">
                                    <td className="p-2.5 font-mono text-[11px]">{line.postedDate}</td>
                                    <td className="p-2.5 font-medium text-[#1C1C1E]">{line.description}</td>
                                    <td className="p-2.5 font-mono text-[11px] text-[#5E5E64]">{line.defaultGlCode}</td>
                                    <td className={`p-2.5 text-right font-mono font-bold ${isDeposit ? "text-[#006838]" : "text-[#1C1C1E]"}`}>
                                      {isDeposit ? `+${amt}` : `-${amt}`}
                                    </td>
                                    <td className="p-2.5 text-center">
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#006838]">
                                        <Check className="h-3 w-3" /> Reconciled
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Step 4 Bottom Navigation Bar */}
                  <div className="flex items-center justify-between border-t border-emerald-100 pt-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveTask("resolve")}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-4 py-1.5 font-semibold text-[#1C1C1E] hover:bg-[#F2F2F7]"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Back to Step 3: Unmatched Items</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTask("connect");
                        setSuccessNotice("You can now connect or reconcile another bank account.");
                      }}
                      className="nb-crisp-pill-lift inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#006838] bg-white px-4 py-1.5 font-semibold text-[#006838] hover:bg-emerald-50"
                    >
                      <Landmark className="h-3.5 w-3.5" />
                      <span>Reconcile Another Bank Account</span>
                    </button>
                  </div>
                </section>
              </div>
            )}
          </div>
        ) : (
          /* Foreign Currency (FX) Revaluation (IAS 21) Tab */
          <div className="grid gap-6 lg:grid-cols-2">
            <section
              aria-labelledby="fx-reval-heading"
              className="rounded-[24px] border border-[#E5E5EA] bg-white p-6 shadow-[0_6px_20px_rgba(28,28,30,0.04)] space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <Globe className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="fx-reval-heading" className="text-lg font-bold text-[#1C1C1E]">
                    Closing CBN / NFEM FX Revaluation (IAS 21)
                  </h2>
                  <p className="text-xs text-[#5E5E64]">
                    Revalue foreign currency domiciliary bank accounts against CBN closing rates to compute statutory unrealized gains and losses.
                  </p>
                </div>
              </div>

              <form onSubmit={runFxRevaluation} className="space-y-4 pt-2">
                <div>
                  <label htmlFor={fxAcctId} className="block text-xs font-semibold uppercase tracking-wider text-[#5E5E64]">
                    Foreign Domiciliary Account
                  </label>
                  <select
                    id={fxAcctId}
                    value={fxAccountId}
                    onChange={(e) => setFxAccountId(e.target.value)}
                    className="mt-1 block min-h-[44px] w-full rounded-xl border border-[#D1D1D6] bg-white px-3 py-2 text-sm text-[#1C1C1E] focus:border-[#006838] focus:outline-none"
                  >
                    {bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor={fxCurrId} className="block text-xs font-semibold uppercase tracking-wider text-[#5E5E64]">
                      Currency
                    </label>
                    <select
                      id={fxCurrId}
                      value={fxCurrency}
                      onChange={(e) => setFxCurrency(e.target.value as CurrencyCode)}
                      className="mt-1 block min-h-[44px] w-full rounded-xl border border-[#D1D1D6] bg-white px-3 py-2 text-sm text-[#1C1C1E] focus:border-[#006838] focus:outline-none"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CNY">CNY (¥)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor={fxRateId} className="block text-xs font-semibold uppercase tracking-wider text-[#5E5E64]">
                      Closing Rate (₦/FX)
                    </label>
                    <input
                      id={fxRateId}
                      type="text"
                      inputMode="decimal"
                      value={closingRate}
                      onChange={(e) => setClosingRate(e.target.value)}
                      className="mt-1 block min-h-[44px] w-full rounded-xl border border-[#D1D1D6] bg-white px-3 py-2 text-sm font-mono text-[#1C1C1E] focus:border-[#006838] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor={fxDateId} className="block text-xs font-semibold uppercase tracking-wider text-[#5E5E64]">
                      As of Date
                    </label>
                    <input
                      id={fxDateId}
                      type="date"
                      value={asOfDate}
                      onChange={(e) => setAsOfDate(e.target.value)}
                      className="mt-1 block min-h-[44px] w-full rounded-xl border border-[#D1D1D6] bg-white px-3 py-2 text-sm text-[#1C1C1E] focus:border-[#006838] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#006838] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#00552D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
                  >
                    {isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Globe className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>Compute IAS 21 FX Revaluation</span>
                  </button>
                </div>
              </form>
            </section>

            {/* FX Revaluation Result Card */}
            <div className="rounded-[24px] border border-[#E5E5EA] bg-white p-6 shadow-[0_6px_20px_rgba(28,28,30,0.04)] space-y-4">
              <h3 className="text-base font-bold text-[#1C1C1E]">
                Revaluation Summary &amp; Statutory Journal
              </h3>
              {fxReport ? (
                <div className="space-y-3 text-xs">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#5E5E64]">Original Foreign Balance:</span>
                      <span className="font-mono font-bold text-[#1C1C1E]">
                        {fxCurrency} {fxReport.foreignBalance}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5E5E64]">Carrying Value (Prior Book Rate):</span>
                      <span className="font-mono font-bold text-[#1C1C1E]">
                        ₦{fxReport.carryingNgn}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5E5E64]">Revalued Value (Closing Rate):</span>
                      <span className="font-mono font-bold text-[#1C1C1E]">
                        ₦{fxReport.revaluedNgn}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-emerald-200 pt-2 text-sm">
                      <span className="font-bold text-[#006838]">Unrealized FX Gain / (Loss):</span>
                      <span className="font-mono font-bold text-[#006838]">
                        ₦{fxReport.unrealizedGainLossNgn}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#5E5E64]">
                    Under IAS 21 (The Effects of Changes in Foreign Exchange Rates), this revaluation difference is recognized immediately in Profit or Loss as an unrealized finance item.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#D1D1D6] p-8 text-center text-xs text-[#5E5E64]">
                  Submit closing CBN rate to calculate IAS 21 revaluation voucher.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Post Modal for bank fees & unrecorded items */}
        <QuickPostModal
          isOpen={quickPostLine !== null}
          statementLine={quickPostLine}
          accounts={accounts}
          onClose={() => setQuickPostLine(null)}
          onPostAndMatch={handleQuickPostComplete}
        />
      </div>
    </div>
  );
}
