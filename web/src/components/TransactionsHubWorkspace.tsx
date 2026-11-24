"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  Layers,
  LayoutGrid,
  Pencil,
  PencilLine,
  Plus,
  PlusCircle,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceMode } from "@/state/workspace-mode";
import { NairaAmount } from "@/components/ui/NairaAmount";
import {
  TRANSACTION_PILLARS,
  TRANSACTION_TYPES,
  formatNaira,
  getTransactionPillarMeta,
  getTransactionTypeMeta,
  type TransactionPillarId,
  type TransactionRecord,
  type TransactionStatus,
  type TransactionTypeId,
} from "@/components/transactions/transactions-data";
import {
  TRANSACTIONS_STORE_EVENT,
  loadTransactions,
  updateTransactionStatusInStore,
} from "@/components/transactions/transactions-store";
import { TransactionIconBadge } from "@/components/transactions/TransactionIconBadge";

export type TransactionsWorkspaceView = "create" | "list" | "edit";

function getStatusBadgeVariant(
  status: TransactionStatus,
): "emerald" | "iosBlue" | "amber" | "destructive" | "outline" | "secondary" {
  switch (status) {
    case "Paid":
    case "Cleared":
    case "Posted":
      return "emerald";
    case "Open":
      return "iosBlue";
    case "Pending":
      return "amber";
    case "Voided":
      return "destructive";
    case "Draft":
    default:
      return "outline";
  }
}

function getNextQuickStatus(status: TransactionStatus): TransactionStatus {
  if (status === "Draft" || status === "Pending") return "Posted";
  if (status === "Open") return "Paid";
  if (status === "Posted") return "Cleared";
  return "Posted";
}

function getQuickStatusActionLabel(status: TransactionStatus): string {
  if (status === "Draft" || status === "Pending") return "Post";
  if (status === "Open") return "Mark Paid";
  if (status === "Posted") return "Clear";
  return "Re-Post";
}

export function TransactionsHubWorkspace({
  workspaceId,
  initialPillar,
  initialType,
  initialChoice,
}: {
  readonly workspaceId?: string;
  readonly initialPillar?: TransactionPillarId;
  readonly initialType?: TransactionTypeId;
  readonly initialChoice?: TransactionsWorkspaceView;
}) {
  const { mode } = useWorkspaceMode();
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (workspaceId && typeof window !== "undefined") {
      try {
        window.localStorage.setItem("nairabooks_active_workspace", workspaceId);
      } catch {
        // Ignore
      }
    }
  }, [workspaceId]);

  const resolvedTypeMeta = initialType
    ? getTransactionTypeMeta(initialType)
    : undefined;

  // The 3 Core Choices Gateway state: "create" | "list" | "edit"
  // Default to "list" so the full register and existing test expectations are active immediately
  const [activeChoice, setActiveChoice] = useState<TransactionsWorkspaceView>(
    initialChoice ?? (initialType ? "create" : "list"),
  );

  const [activePillar, setActivePillar] = useState<TransactionPillarId>(
    resolvedTypeMeta?.pillar ?? initialPillar ?? "money-in",
  );
  const [selectedType, setSelectedType] = useState<TransactionTypeId | "all">(
    resolvedTypeMeta?.id ?? "all",
  );
  const [creationCategoryFilter, setCreationCategoryFilter] = useState<
    TransactionPillarId | "all"
  >("all");
  const [creationSearch, setCreationSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | TransactionStatus>("All");
  const [transactions, setTransactions] = useState<readonly TransactionRecord[]>(() =>
    loadTransactions(workspaceId),
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    function sync() {
      setTransactions(loadTransactions(workspaceId));
    }
    sync();
    window.addEventListener(TRANSACTIONS_STORE_EVENT, sync);
    return () => window.removeEventListener(TRANSACTIONS_STORE_EVENT, sync);
  }, [workspaceId]);

  const currentPillarMeta = getTransactionPillarMeta(activePillar);

  const pillarTypes = useMemo(
    () => TRANSACTION_TYPES.filter((t) => t.pillar === activePillar),
    [activePillar],
  );

  const primaryCreateType: TransactionTypeId =
    selectedType === "all"
      ? pillarTypes[1]?.id ?? pillarTypes[0]?.id ?? "sales-invoicing"
      : selectedType;
  const primaryCreateMeta = getTransactionTypeMeta(primaryCreateType);

  const typeCounts = useMemo(() => {
    const counts = new Map<TransactionTypeId, number>();
    for (const tx of transactions) {
      counts.set(tx.typeId, (counts.get(tx.typeId) ?? 0) + 1);
    }
    return counts;
  }, [transactions]);

  const kpiSummary = useMemo(() => {
    let moneyIn = 0;
    let moneyOut = 0;
    let pendingCount = 0;
    let draftCount = 0;
    for (const tx of transactions) {
      if (tx.status === "Voided") continue;
      const meta = getTransactionTypeMeta(tx.typeId);
      if (meta.direction === "IN") moneyIn += tx.amountNgn;
      if (meta.direction === "OUT") moneyOut += tx.amountNgn;
      if (tx.status === "Open" || tx.status === "Pending") {
        pendingCount += 1;
      }
      if (tx.status === "Draft") {
        draftCount += 1;
      }
    }
    return { moneyIn, moneyOut, pendingCount, draftCount };
  }, [transactions]);

  const visibleTransactions = useMemo(() => {
    const pillarTypeIds = new Set(pillarTypes.map((t) => t.id));
    const q = searchQuery.trim().toLowerCase();

    return transactions
      .filter((tx) => {
        if (selectedType === "all") {
          return pillarTypeIds.has(tx.typeId);
        }
        return tx.typeId === selectedType;
      })
      .filter((tx) => (statusFilter === "All" ? true : tx.status === statusFilter))
      .filter((tx) => {
        if (!q) return true;
        const meta = getTransactionTypeMeta(tx.typeId);
        return (
          tx.reference.toLowerCase().includes(q) ||
          tx.counterparty.toLowerCase().includes(q) ||
          tx.memo.toLowerCase().includes(q) ||
          meta.label.toLowerCase().includes(q) ||
          tx.paymentMethod.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, pillarTypes, selectedType, statusFilter, searchQuery]);

  const filteredCreationTypes = useMemo(() => {
    const q = creationSearch.trim().toLowerCase();
    return TRANSACTION_TYPES.filter((t) => {
      if (creationCategoryFilter !== "all" && t.pillar !== creationCategoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        t.label.toLowerCase().includes(q) ||
        t.singularLabel.toLowerCase().includes(q) ||
        t.simpleSummary.toLowerCase().includes(q) ||
        t.proSummary.toLowerCase().includes(q)
      );
    });
  }, [creationCategoryFilter, creationSearch]);

  const editableTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions
      .filter((tx) => (statusFilter === "All" ? true : tx.status === statusFilter))
      .filter((tx) => {
        if (!q) return true;
        const meta = getTransactionTypeMeta(tx.typeId);
        return (
          tx.reference.toLowerCase().includes(q) ||
          tx.counterparty.toLowerCase().includes(q) ||
          tx.memo.toLowerCase().includes(q) ||
          meta.label.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, statusFilter, searchQuery]);

  function handleSelectPillar(pillarId: TransactionPillarId) {
    setActivePillar(pillarId);
    setSelectedType("all");
    setStatusFilter("All");
  }

  function handleQuickStatusCycle(tx: TransactionRecord) {
    const nextStatus = getNextQuickStatus(tx.status);
    const { records } = updateTransactionStatusInStore(tx.id, nextStatus, workspaceId);
    setTransactions(records);
    setToastMessage(`Updated ${tx.reference} (${tx.counterparty}) to ${nextStatus}.`);
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5 px-3 sm:px-6 pb-sticky-clearance pt-2 sm:pt-4">
        {/* Minimalist Cupertino Header with Status Badges */}
        <motion.section
          initial={prefersReduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="flex flex-col gap-3 rounded-2xl sm:rounded-[22px] border border-[#E5E5EA] bg-white p-4 sm:p-5 shadow-[0_6px_22px_rgba(28,28,30,0.04)] sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <div
              className="inline-flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#E6F5ED] text-[#006838] shadow-inner"
              aria-hidden="true"
            >
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-[-0.03em] text-[#1C1C1E]">
                  Transactions
                </h1>
                <Badge variant="emerald" className="text-[10px] sm:text-[11px]">
                  {TRANSACTION_TYPES.length} Entry Types
                </Badge>
                {mode === "pro" && (
                  <Badge variant="iosBlue" className="font-mono text-[10px]">
                    IFRS · VAT 7.5% · WHT
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs sm:text-sm text-[#5E5E64]">
                Choose an action below to create a new record, inspect the transaction register, or edit existing entries.
              </p>
            </div>
          </div>
        </motion.section>

        {/* 🎛️ THE 3 ACTION BUTTONS (Sleek Segmented Pill Island, Alive, Zero-Clutter) */}
        <section
          aria-label="Choose transaction view"
          className="flex flex-col items-center justify-center gap-2.5 pt-0.5"
        >
          <div
            role="group"
            aria-label="Transaction workspace actions"
            className="flex max-w-full items-center justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar rounded-2xl sm:rounded-full border border-[#D1D1D6] bg-white p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
          >
            {/* 1. Create New */}
            <button
              type="button"
              data-testid="hero-choice-create"
              aria-pressed={activeChoice === "create"}
              onClick={() => setActiveChoice("create")}
              className={`nb-crisp-pill-lift relative inline-flex min-h-[42px] sm:min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 sm:px-5 text-xs font-semibold whitespace-nowrap ${
                activeChoice === "create" ? "text-white" : "text-[#5E5E64] hover:bg-[#F2F2F7] hover:text-[#1C1C1E]"
              }`}
            >
              {activeChoice === "create" && (
                <motion.span
                  layoutId="tx-choice-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-600 to-[#006838] shadow-[0_4px_14px_rgba(0,104,56,0.35)]"
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <span
                  className={`inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full transition-colors ${
                    activeChoice === "create" ? "bg-white/20 text-white" : "bg-emerald-50 text-[#006838]"
                  }`}
                >
                  <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                </span>
                <span className="font-bold tracking-[-0.01em]">Create New</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    activeChoice === "create" ? "bg-white/25 text-white" : "bg-emerald-100 text-[#00582E]"
                  }`}
                >
                  27
                </span>
              </span>
            </button>

            {/* 2. Transaction List */}
            <button
              type="button"
              data-testid="hero-choice-list"
              aria-pressed={activeChoice === "list"}
              onClick={() => setActiveChoice("list")}
              className={`nb-crisp-pill-lift relative inline-flex min-h-[42px] sm:min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 sm:px-5 text-xs font-semibold whitespace-nowrap ${
                activeChoice === "list" ? "text-white" : "text-[#5E5E64] hover:bg-[#F2F2F7] hover:text-[#1C1C1E]"
              }`}
            >
              {activeChoice === "list" && (
                <motion.span
                  layoutId="tx-choice-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-[#0F4C81] shadow-[0_4px_14px_rgba(15,76,129,0.35)]"
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                    activeChoice === "list" ? "bg-white/20 text-white" : "bg-blue-50 text-[#0F4C81]"
                  }`}
                >
                  <ReceiptText className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="font-bold tracking-[-0.01em]">Transaction List</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    activeChoice === "list" ? "bg-white/25 text-white" : "bg-blue-100 text-[#0F4C81]"
                  }`}
                >
                  {transactions.length}
                </span>
              </span>
            </button>

            {/* 3. Edit a Transaction */}
            <button
              type="button"
              data-testid="hero-choice-edit"
              aria-pressed={activeChoice === "edit"}
              onClick={() => setActiveChoice("edit")}
              className={`nb-crisp-pill-lift relative inline-flex min-h-[42px] sm:min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 sm:px-5 text-xs font-semibold whitespace-nowrap ${
                activeChoice === "edit" ? "text-white" : "text-[#5E5E64] hover:bg-[#F2F2F7] hover:text-[#1C1C1E]"
              }`}
            >
              {activeChoice === "edit" && (
                <motion.span
                  layoutId="tx-choice-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-600 to-amber-800 shadow-[0_4px_14px_rgba(180,83,9,0.35)]"
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                    activeChoice === "edit" ? "bg-white/20 text-white" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="font-bold tracking-[-0.01em]">Edit a Transaction</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    activeChoice === "edit" ? "bg-white/25 text-white" : "bg-amber-100 text-amber-900"
                  }`}
                >
                  Audit Safe
                </span>
              </span>
            </button>
          </div>

          {/* Active Context Banner: Explaining active mode */}
          <div className="flex items-center gap-2 text-xs text-[#5E5E64]">
            {activeChoice === "create" && (
              <span className="inline-flex items-center gap-1.5 font-medium text-[#006838]">
                <Sparkles className="h-3.5 w-3.5 text-[#006838]" aria-hidden="true" />
                <span>Creation Studio active &mdash; Choose among 27 statutory Nigerian templates</span>
              </span>
            )}
            {activeChoice === "list" && (
              <span className="inline-flex items-center gap-1.5 font-medium text-[#0F4C81]">
                <ReceiptText className="h-3.5 w-3.5 text-[#0F4C81]" aria-hidden="true" />
                <span>Transaction Register active &mdash; Inspect records across 6 operational pillars</span>
              </span>
            )}
            {activeChoice === "edit" && (
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-800">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
                <span>Edit &amp; Audit Studio active &mdash; CAMA 2020 Section 374 immutability protected</span>
              </span>
            )}
          </div>
        </section>

        {/* Live Status Toast */}
        <div aria-live="polite" className="min-h-[4px]">
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={prefersReduced ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? undefined : { opacity: 0, y: -6 }}
                className="flex items-center justify-between gap-3 rounded-[16px] border border-[#BDE5CF] bg-[#E6F5ED] px-4 py-2.5 text-xs font-semibold text-[#00582E]"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {toastMessage}
                </span>
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                  className="rounded-full px-2.5 py-1 text-[11px] font-bold hover:bg-white/60"
                >
                  Dismiss
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: CREATE NEW TRANSACTION STUDIO                                      */}
        {/* ========================================================================= */}
        {activeChoice === "create" && (
          <motion.section
            key="view-create"
            initial={prefersReduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="rounded-[22px] border border-[#E5E5EA] bg-white p-5 shadow-[0_6px_22px_rgba(28,28,30,0.04)] sm:p-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-[-0.02em] text-[#1C1C1E]">
                  Record a New Transaction
                </h2>
                <p className="text-xs text-[#5E5E64]">
                  Select the transaction sheet you want to open. All 27 Nigerian business templates are pre-configured.
                </p>
              </div>

              {/* Instant Search among 27 types */}
              <div className="relative sm:w-72">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5E5E64]" />
                <input
                  type="search"
                  value={creationSearch}
                  onChange={(e) => setCreationSearch(e.target.value)}
                  placeholder="Search among 27 types..."
                  className="min-h-[44px] w-full rounded-full border border-[#D1D1D6] bg-[#FAFAFC] pl-10 pr-4 text-xs font-medium text-[#1C1C1E] focus:border-[#006838] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                aria-pressed={creationCategoryFilter === "all"}
                onClick={() => setCreationCategoryFilter("all")}
                className={`min-h-[36px] rounded-full px-3.5 text-xs font-semibold transition ${
                  creationCategoryFilter === "all"
                    ? "bg-[#1C1C1E] text-white"
                    : "bg-[#F2F2F7] text-[#1C1C1E] hover:bg-[#E5E5EA]"
                }`}
              >
                All 27 Types
              </button>
              {TRANSACTION_PILLARS.map((p) => {
                const isSelected = creationCategoryFilter === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setCreationCategoryFilter(p.id)}
                    className={`min-h-[36px] rounded-full px-3.5 text-xs font-semibold whitespace-nowrap transition ${
                      isSelected
                        ? "bg-[#006838] text-white"
                        : "bg-[#F2F2F7] text-[#1C1C1E] hover:bg-[#E5E5EA]"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Grid of Transaction Cards */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCreationTypes.map((txType) => {
                const count = typeCounts.get(txType.id) ?? 0;
                return (
                  <div
                    key={txType.id}
                    className="nb-crisp-card-lift group relative flex flex-col justify-between rounded-[18px] border border-[#E5E5EA] bg-[#FAFAFC] p-4 hover:border-[#006838] hover:bg-white hover:shadow-[0_12px_26px_rgba(0,104,56,0.08)]"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <TransactionIconBadge
                          iconKey={txType.iconKey}
                          tintBg={txType.tintBg}
                          tintText={txType.tintText}
                          size="md"
                        />
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              txType.direction === "IN"
                                ? "bg-[#E6F5ED] text-[#00582E]"
                                : txType.direction === "OUT"
                                  ? "bg-[#EAF3FC] text-[#0F4C81]"
                                  : "bg-[#F2F2F7] text-[#5E5E64]"
                            }`}
                          >
                            {txType.direction === "IN" ? "Money In" : txType.direction === "OUT" ? "Money Out" : "Journal"}
                          </span>
                          <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-[#5E5E64] shadow-sm">
                            {count} posted
                          </span>
                        </div>
                      </div>

                      <h3 className="mt-3 text-sm font-bold text-[#1C1C1E] group-hover:text-[#006838]">
                        {txType.label}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#5E5E64]">
                        {mode === "pro" ? txType.proSummary : txType.simpleSummary}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E5E5EA]">
                      <Link
                        href={`/transactions/${txType.id}/new`}
                        className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-full bg-white border border-[#D1D1D6] px-4 py-2 text-xs font-semibold text-[#1C1C1E] shadow-sm transition group-hover:bg-[#006838] group-hover:border-[#006838] group-hover:text-white"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Record {txType.singularLabel}</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: TRANSACTION LIST & REGISTER (Standard Mainstream View)            */}
        {/* ========================================================================= */}
        {activeChoice === "list" && (
          <>
            {/* Directional 3-Metric Summary Strip */}
            <section
              aria-label="Transactions summary metrics"
              className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
            >
              <div className="nb-crisp-card-lift flex items-center justify-between rounded-[18px] border border-[#E5E5EA] dark:border-neutral-800 bg-white dark:bg-[#1C1C1E] px-4 py-3 sm:py-3.5 shadow-[0_2px_10px_rgba(28,28,30,0.03)] hover:border-[#006838]/50">
                <div>
                  <p className="text-[11px] font-semibold text-[#5E5E64] dark:text-neutral-400">Money In Recorded</p>
                  <p className="nb-money-cell mt-0.5 text-left text-lg sm:text-xl font-bold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7]">
                    <NairaAmount amount={kpiSummary.moneyIn} showDecimals={false} />
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F5ED] dark:bg-emerald-950/40 px-2.5 py-1 text-[11px] font-semibold text-[#00582E] dark:text-emerald-400">
                  <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Inflow
                </span>
              </div>

              <div className="nb-crisp-card-lift flex items-center justify-between rounded-[18px] border border-[#E5E5EA] dark:border-neutral-800 bg-white dark:bg-[#1C1C1E] px-4 py-3 sm:py-3.5 shadow-[0_2px_10px_rgba(28,28,30,0.03)] hover:border-[#0F4C81]/50">
                <div>
                  <p className="text-[11px] font-semibold text-[#5E5E64] dark:text-neutral-400">Money Out Recorded</p>
                  <p className="nb-money-cell mt-0.5 text-left text-lg sm:text-xl font-bold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7]">
                    <NairaAmount amount={kpiSummary.moneyOut} showDecimals={false} />
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF3FC] dark:bg-sky-950/40 px-2.5 py-1 text-[11px] font-semibold text-[#0F4C81] dark:text-sky-400">
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  Outflow
                </span>
              </div>

              <div className="nb-crisp-card-lift flex items-center justify-between rounded-[18px] border border-[#E5E5EA] dark:border-neutral-800 bg-white dark:bg-[#1C1C1E] px-4 py-3 sm:py-3.5 shadow-[0_2px_10px_rgba(28,28,30,0.03)] hover:border-amber-600/50">
                <div>
                  <p className="text-[11px] font-semibold text-[#5E5E64] dark:text-neutral-400">Open &amp; Pending Items</p>
                  <p className="nb-money-cell mt-0.5 text-left text-lg sm:text-xl font-bold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7]">
                    {kpiSummary.pendingCount} items
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF9E6] dark:bg-amber-950/40 px-2.5 py-1 text-[11px] font-semibold text-[#784507] dark:text-amber-400">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Actionable
                </span>
              </div>
            </section>

            {/* Main Cupertino Workspace Register Card */}
            <section
              aria-labelledby="transactions-hub-section-heading"
              className="rounded-2xl sm:rounded-[22px] border border-[#E5E5EA] bg-white p-3.5 sm:p-5 shadow-[0_6px_22px_rgba(28,28,30,0.04)]"
            >
              {/* 6 Pillar Segmented Tabs */}
              <div
                role="tablist"
                aria-label="Transaction pillars"
                className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2"
              >
                {TRANSACTION_PILLARS.map((pillar) => {
                  const isSelected = pillar.id === activePillar;
                  return (
                    <button
                      key={pillar.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => handleSelectPillar(pillar.id)}
                      className={`relative inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006838] ${
                        isSelected ? "text-white" : "bg-[#F2F2F7] text-[#1C1C1E] hover:bg-[#E5E5EA]"
                      }`}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="tx-pillar-pill"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          className="absolute inset-0 rounded-full bg-[#1C1C1E]"
                          aria-hidden="true"
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        <span>{pillar.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Pillar Summary & Type Filter Pills */}
              <div className="mt-3 border-t border-[#E5E5EA] pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2
                      id="transactions-hub-section-heading"
                      className="text-lg font-bold tracking-[-0.02em] text-[#1C1C1E]"
                    >
                      {currentPillarMeta.label}
                    </h2>
                    <p className="text-xs text-[#5E5E64]">
                      {mode === "pro"
                        ? currentPillarMeta.proNote
                        : currentPillarMeta.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 sm:w-64 sm:flex-none">
                      <label htmlFor="tx-search-input" className="sr-only">
                        Search transactions
                      </label>
                      <Search
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5E5E64]"
                        aria-hidden="true"
                      />
                      <input
                        id="tx-search-input"
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search ref, party, memo..."
                        className="min-h-[44px] w-full rounded-full border border-[#D1D1D6] bg-[#FAFAFC] pl-10 pr-4 text-xs font-medium text-[#1C1C1E] placeholder:text-[#5E5E64] focus:border-[#006838] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Type Selector Pills inside Pillar */}
                <div
                  className="mt-3.5 flex flex-wrap items-center gap-2"
                  role="group"
                  aria-label={`Filter by transaction type in ${currentPillarMeta.label}`}
                >
                  <button
                    type="button"
                    aria-pressed={selectedType === "all"}
                    onClick={() => setSelectedType("all")}
                    className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                      selectedType === "all"
                        ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                        : "border-[#E5E5EA] bg-[#FAFAFC] text-[#1C1C1E] hover:bg-[#F2F2F7]"
                    }`}
                  >
                    <span>All {currentPillarMeta.shortLabel}</span>
                  </button>

                  {pillarTypes.map((txType) => {
                    const isActive = selectedType === txType.id;
                    const count = typeCounts.get(txType.id) ?? 0;
                    return (
                      <div
                        key={txType.id}
                        className={`inline-flex items-center rounded-full border p-0.5 transition ${
                          isActive
                            ? "border-[#006838] bg-[#E6F5ED]"
                            : "border-[#E5E5EA] bg-[#FAFAFC] hover:bg-[#F2F2F7]"
                        }`}
                      >
                        <button
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => setSelectedType(txType.id)}
                          className={`inline-flex min-h-[38px] items-center gap-2 rounded-full pl-2 pr-2.5 text-xs font-semibold transition ${
                            isActive ? "text-[#00582E]" : "text-[#1C1C1E]"
                          }`}
                        >
                          <TransactionIconBadge
                            iconKey={txType.iconKey}
                            tintBg={txType.tintBg}
                            tintText={txType.tintText}
                            size="sm"
                            animateHover={false}
                          />
                          <span>{txType.label}</span>
                          <span className="rounded-full bg-white/90 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#5E5E64]">
                            {count}
                          </span>
                        </button>
                        <Link
                          href={`/transactions/${txType.id}/new`}
                          aria-label={`Create new ${txType.singularLabel}`}
                          title={`New ${txType.singularLabel}`}
                          className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#006838] shadow-sm transition hover:scale-105 hover:bg-[#006838] hover:text-white"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Type Hint + Create Button */}
                {selectedType !== "all" && (
                  <motion.div
                    initial={prefersReduced ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex flex-col gap-2 rounded-[16px] border border-[#E5E5EA] bg-[#FAFAFC] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <TransactionIconBadge
                        iconKey={primaryCreateMeta.iconKey}
                        tintBg={primaryCreateMeta.tintBg}
                        tintText={primaryCreateMeta.tintText}
                      />
                      <div>
                        <p className="text-xs font-bold text-[#1C1C1E]">
                          {primaryCreateMeta.label}
                        </p>
                        <p className="text-xs text-[#5E5E64]">
                          {mode === "pro"
                            ? primaryCreateMeta.proSummary
                            : primaryCreateMeta.simpleSummary}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/transactions/${primaryCreateMeta.id}/new`}
                      className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#006838] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#00582E]"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      <span>New {primaryCreateMeta.singularLabel}</span>
                    </Link>
                  </motion.div>
                )}

                {/* Status Filter Chips */}
                <div
                  className="mt-3 flex flex-wrap items-center gap-1.5"
                  role="group"
                  aria-label="Filter transactions by status"
                >
                  {(["All", "Posted", "Open", "Paid", "Pending", "Cleared", "Draft", "Voided"] as const).map(
                    (st) => {
                      const active = statusFilter === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setStatusFilter(st)}
                          className={`min-h-[34px] rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                            active
                              ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                              : "border-[#E5E5EA] bg-white text-[#5E5E64] hover:text-[#1C1C1E]"
                          }`}
                        >
                          {st}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {/* Top-to-Down Outline Transaction Register */}
              <div className="mt-4">
                {visibleTransactions.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-[#D1D1D6] bg-[#FAFAFC] p-8 text-center">
                    <p className="text-sm font-bold text-[#1C1C1E]">
                      No matching transactions in this view
                    </p>
                    <p className="mt-1 text-xs text-[#5E5E64]">
                      Clear your search filter or create a new {primaryCreateMeta.singularLabel}.
                    </p>
                    <div className="mt-4">
                      <Link
                        href={`/transactions/${primaryCreateMeta.id}/new`}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#006838] px-5 py-2 text-xs font-semibold text-white hover:bg-[#00582E]"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        <span>New {primaryCreateMeta.singularLabel}</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <ul
                    data-testid="transactions-outline-list"
                    aria-label={`${currentPillarMeta.label} transactions register`}
                    className="divide-y divide-[#E5E5EA] overflow-hidden rounded-[18px] border border-[#E5E5EA] bg-white"
                  >
                    {visibleTransactions.map((tx, idx) => {
                      const meta = getTransactionTypeMeta(tx.typeId);
                      return (
                        <motion.li
                          key={tx.id}
                          initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            delay: Math.min(idx * 0.025, 0.2),
                            type: "spring",
                            stiffness: 320,
                            damping: 26,
                          }}
                          className={`flex flex-col gap-3 px-4 py-3.5 transition sm:flex-row sm:items-center sm:justify-between ${
                            tx.status === "Voided"
                              ? "bg-[#FAFAFC] opacity-75"
                              : "bg-white hover:bg-[#FAFAFC]"
                          }`}
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <TransactionIconBadge
                              iconKey={meta.iconKey}
                              tintBg={meta.tintBg}
                              tintText={meta.tintText}
                            />
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="rounded-md bg-[#F2F2F7] px-2 py-0.5 font-mono text-[11px] font-bold text-[#1C1C1E]">
                                  {tx.reference}
                                </span>
                                <h3 className="truncate text-sm font-bold text-[#1C1C1E]">
                                  {tx.counterparty}
                                </h3>
                                <Badge variant="outline" className="text-[10px]">
                                  {meta.singularLabel}
                                </Badge>
                                <Badge variant={getStatusBadgeVariant(tx.status)} className="text-[10px]">
                                  {tx.status}
                                </Badge>
                                {tx.vatAmountNgn > 0 && (
                                  <Badge variant="emerald" className="font-mono text-[10px]">
                                    VAT 7.5%
                                  </Badge>
                                )}
                                {tx.whtRatePct > 0 && (
                                  <Badge variant="amber" className="font-mono text-[10px]">
                                    WHT {tx.whtRatePct}%
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-[#5E5E64]">
                                <span>{tx.date}</span> &middot; <span>{tx.paymentMethod}</span>
                                {tx.memo ? ` · ${tx.memo}` : ""}
                              </p>
                              {mode === "pro" && (
                                <p className="font-mono text-[11px] text-[#0F4C81]">
                                  GL: {tx.bankOrGlAccount}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center justify-between gap-3 pl-13 sm:justify-end sm:pl-0">
                            <div className="text-left sm:text-right">
                              <p className="text-[10px] font-medium text-[#5E5E64]">
                                {meta.direction === "IN"
                                  ? "Money In"
                                  : meta.direction === "OUT"
                                    ? "Money Out"
                                    : "Entry Value"}
                              </p>
                              <p className="nb-money-cell text-sm font-bold text-[#1C1C1E]">
                                {formatNaira(tx.amountNgn)}
                              </p>
                            </div>

                            {tx.status !== "Voided" && (
                              <button
                                type="button"
                                onClick={() => handleQuickStatusCycle(tx)}
                                className="inline-flex min-h-[38px] items-center rounded-full border border-[#E5E5EA] bg-[#FAFAFC] px-3 text-[11px] font-semibold text-[#1C1C1E] transition hover:bg-[#E6F5ED] hover:text-[#00582E]"
                              >
                                {getQuickStatusActionLabel(tx.status)}
                              </button>
                            )}

                            <Link
                              href={`/transactions/${tx.typeId}/${encodeURIComponent(tx.id)}`}
                              aria-label={`Edit ${tx.reference} ${tx.counterparty}`}
                              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-3.5 text-xs font-semibold text-[#1C1C1E] transition hover:bg-[#F2F2F7]"
                            >
                              <Pencil className="h-3.5 w-3.5 text-[#006838]" aria-hidden="true" />
                              <span>Edit</span>
                            </Link>
                          </div>
                        </motion.li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: EDIT & AUDIT TRANSACTIONS                                         */}
        {/* ========================================================================= */}
        {activeChoice === "edit" && (
          <motion.section
            key="view-edit"
            initial={prefersReduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="rounded-[22px] border border-[#E5E5EA] bg-white p-5 shadow-[0_6px_22px_rgba(28,28,30,0.04)] sm:p-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-[-0.02em] text-[#1C1C1E]">
                    Edit &amp; Manage Transactions
                  </h2>
                  <Badge variant="amber" className="text-[10px]">
                    CAMA Sec 374 Audited
                  </Badge>
                </div>
                <p className="text-xs text-[#5E5E64]">
                  Modify open records, finalize draft invoices, or post statutory reversal journal vouchers.
                </p>
              </div>

              <div className="relative sm:w-72">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5E5E64]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find record to edit..."
                  className="min-h-[44px] w-full rounded-full border border-[#D1D1D6] bg-[#FAFAFC] pl-10 pr-4 text-xs font-medium text-[#1C1C1E] focus:border-amber-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Statutory Guidance Callout */}
            <div className="mt-4 flex items-start gap-3 rounded-[16px] border border-[#FFE8A3] bg-[#FEF9E6] p-3.5 text-xs text-[#784507]">
              <ShieldCheck className="h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <p className="font-bold">Nigerian Statutory Accounting Invariant:</p>
                <p className="mt-0.5 text-[#5C3405]">
                  Under CAMA 2020 Section 374, posted accounting entries cannot be silently deleted. To correct an erroneous posted voucher, open its sheet and post an authorized <strong>Reversal Journal Entry</strong> with an audit reason.
                </p>
              </div>
            </div>

            {/* Quick Status Filters for Edit */}
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              {(["All", "Draft", "Open", "Pending", "Posted"] as const).map((st) => {
                const active = statusFilter === st;
                return (
                  <button
                    key={st}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStatusFilter(st)}
                    className={`min-h-[36px] rounded-full px-3.5 text-xs font-semibold transition ${
                      active
                        ? "bg-[#1C1C1E] text-white"
                        : "bg-[#F2F2F7] text-[#1C1C1E] hover:bg-[#E5E5EA]"
                    }`}
                  >
                    {st === "All" ? `All Records (${transactions.length})` : `${st} (${transactions.filter((t) => t.status === st).length})`}
                  </button>
                );
              })}
            </div>

            {/* List of Editable Records */}
            <div className="mt-4 divide-y divide-[#E5E5EA] overflow-hidden rounded-[18px] border border-[#E5E5EA] bg-white">
              {editableTransactions.map((tx) => {
                const meta = getTransactionTypeMeta(tx.typeId);
                return (
                  <div
                    key={tx.id}
                    className="flex flex-col gap-3 p-4 transition sm:flex-row sm:items-center sm:justify-between hover:bg-[#FAFAFC]"
                  >
                    <div className="flex items-start gap-3">
                      <TransactionIconBadge
                        iconKey={meta.iconKey}
                        tintBg={meta.tintBg}
                        tintText={meta.tintText}
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#1C1C1E]">
                            {tx.reference}
                          </span>
                          <span className="text-sm font-bold text-[#1C1C1E]">
                            {tx.counterparty}
                          </span>
                          <Badge variant={getStatusBadgeVariant(tx.status)} className="text-[10px]">
                            {tx.status}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {meta.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-[#5E5E64]">
                          Date: {tx.date} &middot; Method: {tx.paymentMethod} &middot; Amount: <span className="font-mono font-bold text-[#1C1C1E]">{formatNaira(tx.amountNgn)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-12 sm:pl-0">
                      {tx.status !== "Voided" && (
                        <button
                          type="button"
                          onClick={() => handleQuickStatusCycle(tx)}
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-3.5 text-xs font-semibold text-[#1C1C1E] transition hover:bg-[#E6F5ED] hover:text-[#00582E]"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>{getQuickStatusActionLabel(tx.status)}</span>
                        </button>
                      )}

                      <Link
                        href={`/transactions/${tx.typeId}/${encodeURIComponent(tx.id)}`}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#1C1C1E] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-black"
                      >
                        <Pencil className="h-3.5 w-3.5 text-amber-400" />
                        <span>Edit Full Sheet</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}
      </div>
    </MotionConfig>
  );
}
