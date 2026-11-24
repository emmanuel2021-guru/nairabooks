"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Lock,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  formatNaira,
  getTransactionTypeMeta,
  parseAmountNumber,
  type TransactionLineItem,
  type TransactionRecord,
  type TransactionStatus,
  type TransactionTypeId,
} from "@/components/transactions/transactions-data";
import {
  TRANSACTION_EDITOR_BLUEPRINTS,
  type TransactionExtraField,
} from "@/components/transactions/transaction-editor-schemas";
import { TransactionIconBadge } from "@/components/transactions/TransactionIconBadge";
import { TransactionLayoutCanvas } from "@/components/transactions/TransactionEditorLayouts";
import {
  deleteTransaction,
  findTransactionById,
  loadTransactions,
  upsertTransaction,
} from "@/components/transactions/transactions-store";
import { loadAdminRecords } from "@/components/admin/admin-store";
import type { AdminRecord } from "@/components/admin/admin-maintain-data";
import {
  categoryFromIfrsElement,
  computePayslip,
  computeStockCount,
  parseAccountCode,
  suggestLineAccountCode,
  type PostingChartAccount,
} from "@/lib/posting-rules";

/** The company's postable accounts, as the ledger sees them. */
function chartFromAdminRecords(records: readonly AdminRecord[]): PostingChartAccount[] {
  const chart: PostingChartAccount[] = [];
  for (const r of records) {
    if (r.module !== "accounts" || r.accountLevel === "GROUP" || !r.isActive) continue;
    const category = categoryFromIfrsElement(r.ifrsElement ?? r.category);
    if (category && /^\d{3,6}$/.test(r.code)) chart.push({ code: r.code, name: r.name, category });
  }
  return chart.sort((a, b) => a.code.localeCompare(b.code));
}

/** Point a line at a real account in this company's chart ("" = choose automatically). */
function normalizeLineAccount(
  line: TransactionLineItem,
  typeId: TransactionTypeId,
  chart: readonly PostingChartAccount[],
): TransactionLineItem {
  const code = parseAccountCode(line.accountCode);
  const own = code ? chart.find((a) => a.code === code) : undefined;
  if (own) return { ...line, accountCode: `${own.code} ${own.name}` };
  const suggested = suggestLineAccountCode(typeId, chart);
  const match = suggested ? chart.find((a) => a.code === suggested) : undefined;
  return { ...line, accountCode: match ? `${match.code} ${match.name}` : "" };
}

function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
import type { RecordModuleId } from "@/components/admin/admin-maintain-data";
import { getNextTransactionReference } from "@/lib/numbering-service";

export type TxCreationDetailMode = "simple" | "full";

interface EditorFormState {
  readonly id: string;
  readonly reference: string;
  readonly counterparty: string;
  readonly date: string;
  readonly dueDate: string;
  readonly status: TransactionStatus;
  readonly paymentMethod: string;
  readonly vatEnabled: boolean;
  readonly whtRatePct: 0 | 2 | 5 | 10;
  readonly memo: string;
  readonly lineItems: readonly TransactionLineItem[];
  readonly details: Readonly<Record<string, string>>;
}

function buildDefaultLines(typeId: TransactionTypeId): TransactionLineItem[] {
  const blueprint = TRANSACTION_EDITOR_BLUEPRINTS[typeId];
  const defaultAccount = blueprint.defaultAccountOptions[0] ?? "4010 Sales Revenue";

  if (blueprint.editorLayout === "journal-grid") {
    return [
      {
        id: "line-1",
        description: "Debit ledger entry",
        accountCode: blueprint.defaultAccountOptions[0] ?? "6510 Depreciation Expense",
        quantity: 1,
        unitPriceNgn: 0,
        vatApplicable: false,
        debitNgn: 50000,
        creditNgn: 0,
      },
      {
        id: "line-2",
        description: "Credit ledger entry",
        accountCode: blueprint.defaultAccountOptions[1] ?? "1010 Zenith Bank Current (NGN)",
        quantity: 1,
        unitPriceNgn: 0,
        vatApplicable: false,
        debitNgn: 0,
        creditNgn: 50000,
      },
    ];
  }

  const supportsDirectManual = typeId === "receive-money" || typeId === "payments";

  return [
    {
      id: "line-1",
      description: "",
      accountCode: defaultAccount,
      quantity: 1,
      unitPriceNgn: 0,
      vatApplicable: blueprint.defaultVatEnabled,
      selected: true,
      ...(supportsDirectManual ? { entryKind: "manual-item" as const } : {}),
    },
  ];
}

function buildInitialDetails(
  typeId: TransactionTypeId,
  existing?: TransactionRecord,
): Record<string, string> {
  const blueprint = TRANSACTION_EDITOR_BLUEPRINTS[typeId];
  const seeded: Record<string, string> = {};
  for (const field of blueprint.extraFields) {
    if (field.defaultValue !== undefined) {
      seeded[field.key] = field.defaultValue;
    }
  }
  return { ...seeded, ...(existing?.details ?? {}) };
}

function createInitialFormState(
  typeId: TransactionTypeId,
  mode: "create" | "edit",
  existing?: TransactionRecord,
): EditorFormState {
  const meta = getTransactionTypeMeta(typeId);
  const blueprint = TRANSACTION_EDITOR_BLUEPRINTS[typeId];
  const nextReference =
    mode === "edit" && existing
      ? existing.reference
      : getNextTransactionReference(typeId);

  return {
    id:
      mode === "edit" && existing
        ? existing.id
        : `tx-${typeId}-${Date.now()}`,
    reference: nextReference,
    counterparty: existing?.counterparty ?? "",
    date: existing?.date ?? isoDate(),
    dueDate: existing?.dueDate ?? isoDate(30),
    status: existing?.status ?? "Posted",
    paymentMethod: existing?.paymentMethod ?? blueprint.defaultPaymentMethod,
    vatEnabled: existing ? existing.vatAmountNgn > 0 : blueprint.defaultVatEnabled,
    whtRatePct: existing?.whtRatePct ?? blueprint.defaultWhtRatePct,
    memo: existing?.memo ?? "",
    lineItems:
      existing && existing.lineItems.length > 0
        ? [...existing.lineItems]
        : buildDefaultLines(typeId),
    details: buildInitialDetails(typeId, existing),
  };
}

export function TransactionRecordEditorWorkspace({
  mode,
  typeId,
  recordId,
  onNavigateBack,
}: {
  readonly mode: "create" | "edit";
  readonly typeId: TransactionTypeId;
  readonly recordId?: string;
  readonly onNavigateBack?: (href: string) => void;
}) {
  const prefersReduced = useReducedMotion();
  const meta = getTransactionTypeMeta(typeId);
  const blueprint = TRANSACTION_EDITOR_BLUEPRINTS[typeId];
  const backHref = `/transactions?type=${typeId}`;

  // Simple vs Full toggle applies strictly to creation; Edit mode is ALWAYS locked to Full Mode.
  const [creationMode, setCreationMode] = useState<TxCreationDetailMode>("simple");
  const isFullMode = mode === "edit" || creationMode === "full";
  const [activeFullTab, setActiveFullTab] = useState<"details" | "accounting" | "settlement">(
    "details",
  );

  const initialRecord = useMemo(
    () => (mode === "edit" && recordId ? findTransactionById(recordId) : undefined),
    [mode, recordId],
  );

  const targetCounterpartyModule = useMemo<RecordModuleId>(() => {
    if (
      meta.pillar === "money-in" ||
      typeId === "quotes-sales-orders" ||
      typeId === "sales-invoicing" ||
      typeId === "receive-money" ||
      typeId === "credit-memos" ||
      typeId === "invoice-time-expenses"
    ) {
      return "customers";
    }
    if (meta.pillar === "time-payroll") {
      return "employees";
    }
    return "vendors";
  }, [meta.pillar, typeId]);

  const [liveAdminRecords, setLiveAdminRecords] = useState(() => loadAdminRecords());
  useEffect(() => {
    setLiveAdminRecords(loadAdminRecords());
  }, []);

  const liveCounterparties = useMemo(() => {
    return liveAdminRecords.filter((r) => r.module === targetCounterpartyModule);
  }, [liveAdminRecords, targetCounterpartyModule]);

  const liveChart = useMemo(() => chartFromAdminRecords(liveAdminRecords), [liveAdminRecords]);
  const accountOptions = useMemo(
    () =>
      liveChart.length > 0
        ? liveChart.map((a) => `${a.code} ${a.name}`)
        : blueprint.defaultAccountOptions,
    [liveChart, blueprint.defaultAccountOptions],
  );

  const [form, setForm] = useState<EditorFormState>(() =>
    createInitialFormState(typeId, mode, initialRecord),
  );

  // New records start on accounts that exist in this company's chart.
  useEffect(() => {
    if (mode !== "create" || liveChart.length === 0) return;
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((l) => normalizeLineAccount(l, typeId, liveChart)),
    }));
  }, [mode, typeId, liveChart]);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [counterpartySearchOpen, setCounterpartySearchOpen] = useState(false);

  const filteredCounterparties = useMemo(() => {
    if (!form.counterparty.trim()) {
      return liveCounterparties.slice(0, 8);
    }
    const q = form.counterparty.toLowerCase();
    return liveCounterparties.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.contactOrNote && c.contactOrNote.toLowerCase().includes(q)),
    );
  }, [liveCounterparties, form.counterparty]);

  const displayChips = useMemo(() => {
    if (liveCounterparties.length > 0) {
      return liveCounterparties.slice(0, 5).map((c) => c.name);
    }
    return blueprint.counterpartySuggestions;
  }, [liveCounterparties, blueprint.counterpartySuggestions]);

  useEffect(() => {
    const records = loadTransactions();
    if (mode === "edit" && recordId) {
      const found = records.find((tx) => tx.id === recordId);
      if (found) {
        setForm(createInitialFormState(typeId, "edit", found));
      }
    }
  }, [typeId, mode, recordId]);

  const computedTotals = useMemo(() => {
    if (blueprint.editorLayout === "payroll-slip") {
      const { gross } = computePayslip(form.details);
      return { subtotal: gross, vatAmount: 0, whtAmount: 0, grandTotal: gross, isBalanced: true };
    }

    if (blueprint.editorLayout === "inventory-bom") {
      const { value } = computeStockCount(typeId, form.details);
      return { subtotal: value, vatAmount: 0, whtAmount: 0, grandTotal: value, isBalanced: true };
    }

    if (blueprint.editorLayout === "journal-grid") {
      const totalDebit = form.lineItems.reduce((sum, l) => sum + (l.debitNgn ?? 0), 0);
      const totalCredit = form.lineItems.reduce((sum, l) => sum + (l.creditNgn ?? 0), 0);
      const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;
      return {
        subtotal: totalDebit,
        vatAmount: 0,
        whtAmount: 0,
        grandTotal: totalDebit,
        isBalanced: balanced,
      };
    }

    let subtotal = 0;
    let taxableSubtotal = 0;
    for (const line of form.lineItems) {
      if (
        blueprint.editorLayout === "settlement" &&
        line.entryKind !== "manual-item" &&
        line.selected === false
      ) {
        continue;
      }
      const base = (line.quantity || 1) * (line.unitPriceNgn || 0);
      subtotal += base;
      if (form.vatEnabled && line.vatApplicable) {
        taxableSubtotal += base;
      }
    }

    const vatAmount = form.vatEnabled ? Math.round(taxableSubtotal * 0.075 * 100) / 100 : 0;
    const whtAmount =
      blueprint.supportsWht && form.whtRatePct > 0
        ? Math.round(subtotal * (form.whtRatePct / 100) * 100) / 100
        : 0;
    const grandTotal = subtotal + vatAmount;
    return { subtotal, vatAmount, whtAmount, grandTotal, isBalanced: true };
  }, [
    blueprint.editorLayout,
    blueprint.supportsWht,
    form.details,
    form.lineItems,
    form.vatEnabled,
    form.whtRatePct,
    typeId,
  ]);

  function updateLine(index: number, patch: Partial<TransactionLineItem>) {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }));
  }

  function addLine(entryKind?: TransactionLineItem["entryKind"]) {
    setForm((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          id: `line-${prev.lineItems.length + 1}-${Date.now().toString(36)}`,
          description: "",
          accountCode: blueprint.defaultAccountOptions[0] ?? "4010 Sales Revenue",
          quantity: 1,
          unitPriceNgn: 0,
          vatApplicable: form.vatEnabled,
          debitNgn: 0,
          creditNgn: 0,
          selected: true,
          ...(entryKind ? { entryKind } : {}),
        },
      ],
    }));
  }

  function removeLine(index: number) {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  }

  function updateDetail(key: string, value: string) {
    setForm((prev) => ({
      ...prev,
      details: { ...prev.details, [key]: value },
    }));
  }

  function renderExtraField(field: TransactionExtraField) {
    const fieldId = `tx-extra-${field.key}`;
    const value = form.details[field.key] ?? "";

    return (
      <div key={field.key}>
        <label htmlFor={fieldId} className="block text-xs font-semibold text-[#1C1C1E]">
          {field.label}
        </label>
        {field.type === "select" ? (
          <select
            id={fieldId}
            value={value}
            onChange={(e) => updateDetail(field.key, e.target.value)}
            className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3 text-sm font-medium text-[#1C1C1E]"
          >
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : field.type === "textarea" ? (
          <textarea
            id={fieldId}
            rows={3}
            value={value}
            onChange={(e) => updateDetail(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="mt-1.5 w-full rounded-[12px] border border-[#D1D1D6] bg-white p-3 text-sm text-[#1C1C1E]"
          />
        ) : (
          <input
            id={fieldId}
            type={field.type}
            value={value}
            onChange={(e) => updateDetail(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3.5 text-sm font-medium text-[#1C1C1E]"
          />
        )}
      </div>
    );
  }

  async function handleSave(saveAndNew = false) {
    setErrorBanner(null);

    if (blueprint.editorLayout === "journal-grid" && !computedTotals.isBalanced) {
      setErrorBanner("General Journal Debits must equal Credits before posting.");
      return;
    }

    const cleanCounterparty =
      form.counterparty.trim() || `${meta.singularLabel} Entry`;

    const savedRecord: TransactionRecord = {
      id: form.id,
      typeId,
      reference: form.reference.trim() || `${meta.refPrefix}NEW`,
      counterparty: cleanCounterparty,
      date: form.date,
      dueDate: form.dueDate,
      status: form.status,
      amountNgn: computedTotals.grandTotal,
      vatAmountNgn: computedTotals.vatAmount,
      whtRatePct: form.whtRatePct,
      whtAmountNgn: computedTotals.whtAmount,
      paymentMethod: form.paymentMethod,
      bankOrGlAccount: `${blueprint.defaultDebitAccount} · ${blueprint.defaultCreditAccount}`,
      memo: form.memo.trim() || `${meta.singularLabel} recorded in NairaBooks`,
      lineItems: form.lineItems,
      details: form.details,
    };

    upsertTransaction(savedRecord);
    setSaving(true);
    const posted = await postToLedger(savedRecord);
    setSaving(false);
    if (!posted) return; // stay on the form so the error can be read and fixed

    if (saveAndNew && mode === "create") {
      setStatusBanner(
        `Saved ${savedRecord.reference} (${formatNaira(savedRecord.amountNgn)}) — ready for your next ${meta.singularLabel}.`,
      );
      const fresh = createInitialFormState(typeId, "create");
      setForm({
        ...fresh,
        lineItems: fresh.lineItems.map((l) => normalizeLineAccount(l, typeId, liveChart)),
      });
      return;
    }

    setStatusBanner(
      mode === "create"
        ? `Created ${savedRecord.reference} for ${savedRecord.counterparty} (${formatNaira(savedRecord.amountNgn)}).`
        : `Updated ${savedRecord.reference} for ${savedRecord.counterparty}.`,
    );

    if (onNavigateBack && !saveAndNew) {
      window.setTimeout(() => {
        onNavigateBack(backHref);
      }, 450);
    }
  }

  /** Post (or re-post) the record to the server ledger and report what happened. */
  async function postToLedger(record: TransactionRecord): Promise<boolean> {
    if (typeof window === "undefined") return true;
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...record, vatEnabled: form.vatEnabled }),
      });
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (res.ok && data && data.posted === true) {
        upsertTransaction({
          ...record,
          voucherId: String(data.voucherId ?? ""),
          voucherNumber: String(data.voucherNumber ?? ""),
          isPostedToLedger: true,
        });
        return true;
      }
      if (res.ok && data && data.posted === false) {
        const { voucherId: _voucherId, voucherNumber: _voucherNumber, ...rest } = record;
        upsertTransaction({ ...rest, isPostedToLedger: false });
        return true;
      }
      upsertTransaction({ ...record, isPostedToLedger: false });
      const message =
        data && typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
      setStatusBanner(null);
      setErrorBanner(`${record.reference} was saved but NOT posted to the ledger: ${message}`);
      return false;
    } catch {
      setErrorBanner(
        `${record.reference} was saved on this device but could not reach the ledger. Open it and save again when you are back online.`,
      );
      return false;
    }
  }

  function handleDeleteOrVoid() {
    if (mode !== "edit") return;
    deleteTransaction(form.id);
    if (typeof window !== "undefined") {
      void fetch(`/api/transactions?id=${encodeURIComponent(form.id)}`, { method: "DELETE" }).catch(
        () => undefined,
      );
    }
    setStatusBanner(`Removed ${form.reference} from ${meta.label}.`);
    if (onNavigateBack) {
      window.setTimeout(() => {
        onNavigateBack(backHref);
      }, 350);
    }
  }

  const simpleExtraFields = blueprint.extraFields.filter((f) => f.includeInSimple);
  const tabExtraFields = blueprint.extraFields.filter((f) => f.tab === activeFullTab);

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-5xl space-y-5 px-4 pb-sticky-clearance pt-4 sm:px-6">
        {/* Back Breadcrumb & Mode Switcher */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={backHref}
            className="inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full border border-[#D1D1D6] bg-white px-4 py-2 text-xs font-semibold text-[#1C1C1E] transition hover:bg-[#F2F2F7]"
          >
            <ArrowLeft className="h-4 w-4 text-[#006838]" aria-hidden="true" />
            <span>Back to {meta.label}</span>
          </Link>

          {mode === "create" ? (
            <div
              data-testid="tx-creation-mode-toggle"
              role="group"
              aria-label="Creation complexity mode"
              className="inline-flex items-center rounded-full border border-[#E5E5EA] bg-white p-1 shadow-sm"
            >
              <button
                type="button"
                aria-pressed={creationMode === "simple"}
                onClick={() => setCreationMode("simple")}
                className={`relative min-h-[38px] rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  creationMode === "simple" ? "text-white" : "text-[#5E5E64] hover:text-[#1C1C1E]"
                }`}
              >
                {creationMode === "simple" && (
                  <motion.span
                    layoutId="tx-create-mode-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    className="absolute inset-0 rounded-full bg-[#006838]"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10">Simple Creation</span>
              </button>
              <button
                type="button"
                aria-pressed={creationMode === "full"}
                onClick={() => setCreationMode("full")}
                className={`relative min-h-[38px] rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  creationMode === "full" ? "text-white" : "text-[#5E5E64] hover:text-[#1C1C1E]"
                }`}
              >
                {creationMode === "full" && (
                  <motion.span
                    layoutId="tx-create-mode-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    className="absolute inset-0 rounded-full bg-[#1C1C1E]"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10">Full Creation</span>
              </button>
            </div>
          ) : (
            <Badge
              data-testid="tx-edit-full-badge"
              variant="default"
              className="min-h-[36px] px-3.5 text-xs"
            >
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Full Transaction Mode (Edit)</span>
            </Badge>
          )}
        </div>

        {/* Editor Hero Card */}
        <motion.section
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="rounded-[22px] border border-[#E5E5EA] bg-white p-5 shadow-[0_6px_22px_rgba(28,28,30,0.04)]"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <TransactionIconBadge
                iconKey={meta.iconKey}
                tintBg={meta.tintBg}
                tintText={meta.tintText}
                size="lg"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-[-0.025em] text-[#1C1C1E] sm:text-2xl">
                    {mode === "create" ? `New ${meta.singularLabel}` : `Edit ${meta.singularLabel}`}
                  </h1>
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {form.reference}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-[#5E5E64]">
                  {isFullMode ? blueprint.fullIntro : blueprint.simpleIntro}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-[11px] font-semibold text-[#5E5E64]">Total Value</p>
              <p
                aria-live="polite"
                className="nb-money-cell text-2xl font-bold tracking-tight text-[#006838]"
              >
                {formatNaira(computedTotals.grandTotal)}
              </p>
            </div>
          </div>
        </motion.section>

        {/* Live Feedback Banners */}
        <div aria-live="polite" className="space-y-2">
          <AnimatePresence>
            {statusBanner && (
              <motion.div
                initial={prefersReduced ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? undefined : { opacity: 0 }}
                className="flex items-center gap-2 rounded-[16px] border border-[#BDE5CF] bg-[#E6F5ED] px-4 py-3 text-xs font-semibold text-[#00582E]"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{statusBanner}</span>
              </motion.div>
            )}
            {errorBanner && (
              <motion.div
                initial={prefersReduced ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? undefined : { opacity: 0 }}
                role="alert"
                className="rounded-[16px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs font-semibold text-[#B91C1C]"
              >
                {errorBanner}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Editor Form Container */}
        <div className="rounded-[22px] border border-[#E5E5EA] bg-white p-5 shadow-[0_6px_22px_rgba(28,28,30,0.04)]">
          {/* Core Identity Fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2">
              <div className="flex items-center justify-between">
                <label htmlFor="tx-counterparty" className="block text-xs font-semibold text-[#1C1C1E]">
                  {blueprint.counterpartyLabel}
                </label>
                {liveCounterparties.length > 0 && (
                  <span className="text-[11px] font-medium text-[#006838]">
                    {liveCounterparties.length} available
                  </span>
                )}
              </div>
              <div className="relative mt-1.5">
                <input
                  id="tx-counterparty"
                  type="text"
                  value={form.counterparty}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, counterparty: e.target.value }));
                    setCounterpartySearchOpen(true);
                  }}
                  onFocus={() => setCounterpartySearchOpen(true)}
                  placeholder={blueprint.counterpartyPlaceholder}
                  className="min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3.5 pr-10 text-sm font-semibold text-[#1C1C1E] focus:border-[#006838] focus:outline-none focus:ring-2 focus:ring-[#006838]/20"
                />
                {liveCounterparties.length > 0 && (
                  <button
                    type="button"
                    aria-label="Toggle Counterparty Picker"
                    onClick={() => setCounterpartySearchOpen((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#5E5E64] hover:bg-[#F2F2F7]"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                )}

                {/* Searchable Picker Dropdown Popover */}
                {counterpartySearchOpen && filteredCounterparties.length > 0 && (
                  <div
                    role="listbox"
                    aria-label={`Matching ${targetCounterpartyModule}`}
                    className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-[14px] border border-[#E5E5EA] bg-white py-1.5 shadow-lg"
                  >
                    {filteredCounterparties.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        role="option"
                        aria-selected={form.counterparty === c.name}
                        onClick={() => {
                          setForm((p) => ({ ...p, counterparty: c.name }));
                          setCounterpartySearchOpen(false);
                        }}
                        className="flex w-full items-center justify-between px-3.5 py-2 text-left text-xs transition hover:bg-[#E6F5ED]"
                      >
                        <div>
                          <p className="font-semibold text-[#1C1C1E]">{c.name}</p>
                          <p className="text-[11px] text-[#5E5E64]">{c.contactOrNote || c.category}</p>
                        </div>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {c.code}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Party Suggestions / Registered Chips */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {displayChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setForm((p) => ({ ...p, counterparty: chip }));
                      setCounterpartySearchOpen(false);
                    }}
                    className="rounded-full border border-[#E5E5EA] bg-[#FAFAFC] px-2.5 py-1 text-[11px] font-medium text-[#5E5E64] transition hover:border-[#006838] hover:bg-[#E6F5ED] hover:text-[#00582E]"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="tx-reference" className="block text-xs font-semibold text-[#1C1C1E]">
                {blueprint.referenceLabel}
              </label>
              <input
                id="tx-reference"
                type="text"
                value={form.reference}
                onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
                className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3.5 font-mono text-sm font-bold text-[#1C1C1E]"
              />
            </div>

            <div>
              <label htmlFor="tx-date" className="block text-xs font-semibold text-[#1C1C1E]">
                Posting Date
              </label>
              <input
                id="tx-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3.5 text-sm font-medium text-[#1C1C1E]"
              />
            </div>
          </div>

          {/* Simple vs Full Mode Body */}
          {!isFullMode ? (
            <div data-testid="tx-simple-pane" className="mt-5 space-y-5 border-t border-[#E5E5EA] pt-5">
              {simpleExtraFields.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {simpleExtraFields.map(renderExtraField)}
                </div>
              )}

              <TransactionLayoutCanvas
                layout={blueprint.editorLayout}
                typeId={typeId}
                isFullMode={false}
                accountOptions={accountOptions}
                lineItems={form.lineItems}
                onUpdateLine={updateLine}
                onAddLine={addLine}
                onRemoveLine={removeLine}
                details={form.details}
                onUpdateDetail={updateDetail}
                vatEnabled={form.vatEnabled}
                memo={form.memo}
                onMemoChange={(memo) => setForm((p) => ({ ...p, memo }))}
              />

              {blueprint.supportsVat && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#E5E5EA] bg-[#FAFAFC] px-4 py-3">
                  <div>
                    <p className="text-xs font-bold text-[#1C1C1E]">Apply 7.5% Nigeria VAT</p>
                    <p className="text-[11px] text-[#5E5E64]">
                      Automatically computes 7.5% VAT on checked lines.
                    </p>
                  </div>
                  <Switch
                    checked={form.vatEnabled}
                    onCheckedChange={(checked) =>
                      setForm((p) => ({ ...p, vatEnabled: checked }))
                    }
                    aria-label="Apply 7.5% Nigeria VAT"
                  />
                </div>
              )}
            </div>
          ) : (
            <div data-testid="tx-full-pane" className="mt-5 space-y-5 border-t border-[#E5E5EA] pt-5">
              {/* Full Mode Enterprise Tabs */}
              <div
                role="tablist"
                aria-label="Full transaction editor sections"
                className="flex flex-wrap items-center gap-1.5"
              >
                {(
                  [
                    { id: "details", label: "Details & Lines" },
                    { id: "accounting", label: "Tax & Accounting" },
                    { id: "settlement", label: "Settlement & Notes" },
                  ] as const
                ).map((tab) => {
                  const active = activeFullTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveFullTab(tab.id)}
                      className={`min-h-[40px] rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                          : "border-[#E5E5EA] bg-[#FAFAFC] text-[#5E5E64] hover:text-[#1C1C1E]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {activeFullTab === "details" && (
                <div className="space-y-5">
                  {tabExtraFields.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {tabExtraFields.map(renderExtraField)}
                    </div>
                  )}

                  <TransactionLayoutCanvas
                    layout={blueprint.editorLayout}
                    typeId={typeId}
                    isFullMode={true}
                    accountOptions={accountOptions}
                    lineItems={form.lineItems}
                    onUpdateLine={updateLine}
                    onAddLine={addLine}
                    onRemoveLine={removeLine}
                    details={form.details}
                    onUpdateDetail={updateDetail}
                    vatEnabled={form.vatEnabled}
                    memo={form.memo}
                    onMemoChange={(memo) => setForm((p) => ({ ...p, memo }))}
                  />
                </div>
              )}

              {activeFullTab === "accounting" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {blueprint.supportsVat && (
                      <div className="flex items-center justify-between rounded-[14px] border border-[#E5E5EA] bg-[#FAFAFC] px-4 py-3">
                        <div>
                          <p className="text-xs font-bold text-[#1C1C1E]">7.5% NRS VAT</p>
                          <p className="text-[11px] text-[#5E5E64]">
                            Computed VAT: {formatNaira(computedTotals.vatAmount)}
                          </p>
                        </div>
                        <Switch
                          checked={form.vatEnabled}
                          onCheckedChange={(checked) =>
                            setForm((p) => ({ ...p, vatEnabled: checked }))
                          }
                          aria-label="Toggle 7.5% NRS VAT"
                        />
                      </div>
                    )}

                    {blueprint.supportsWht && (
                      <div>
                        <label htmlFor="tx-wht-rate" className="block text-xs font-semibold text-[#1C1C1E]">
                          Withholding Tax (WHT) Rate
                        </label>
                        <select
                          id="tx-wht-rate"
                          value={form.whtRatePct}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              whtRatePct: Number(e.target.value) as 0 | 2 | 5 | 10,
                            }))
                          }
                          className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3 text-sm font-medium text-[#1C1C1E]"
                        >
                          <option value={0}>0% — No WHT</option>
                          <option value={2}>2% — Goods &amp; Supply</option>
                          <option value={5}>5% — Services &amp; Contracts</option>
                          <option value={10}>10% — Rent / Dividends / Directors</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {tabExtraFields.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {tabExtraFields.map(renderExtraField)}
                    </div>
                  )}

                  {/* Live Double-Entry GL Impact Preview */}
                  <div className="rounded-[16px] border border-[#BDE5CF] bg-[#E6F5ED]/45 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#00582E]">
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      <span>Automatic Double-Entry Impact Preview</span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-[12px] bg-white p-3 text-xs">
                        <p className="font-bold text-[#00582E]">DEBIT (DR)</p>
                        <p className="mt-0.5 font-semibold text-[#1C1C1E]">
                          {blueprint.defaultDebitAccount}
                        </p>
                        <p className="nb-money-cell mt-1 text-left font-bold text-[#1C1C1E]">
                          {formatNaira(computedTotals.grandTotal)}
                        </p>
                      </div>
                      <div className="rounded-[12px] bg-white p-3 text-xs">
                        <p className="font-bold text-[#0F4C81]">CREDIT (CR)</p>
                        <p className="mt-0.5 font-semibold text-[#1C1C1E]">
                          {blueprint.defaultCreditAccount}
                          {computedTotals.vatAmount > 0 ? " + 2210 Output VAT" : ""}
                        </p>
                        <p className="nb-money-cell mt-1 text-left font-bold text-[#1C1C1E]">
                          {formatNaira(computedTotals.grandTotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeFullTab === "settlement" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label htmlFor="tx-status" className="block text-xs font-semibold text-[#1C1C1E]">
                        Transaction Status
                      </label>
                      <select
                        id="tx-status"
                        value={form.status}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            status: e.target.value as TransactionStatus,
                          }))
                        }
                        className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3 text-sm font-medium text-[#1C1C1E]"
                      >
                        {(["Posted", "Open", "Paid", "Cleared", "Pending", "Draft", "Voided"] as const).map(
                          (st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="tx-payment-method" className="block text-xs font-semibold text-[#1C1C1E]">
                        Payment / Rail Method
                      </label>
                      <select
                        id="tx-payment-method"
                        value={form.paymentMethod}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, paymentMethod: e.target.value }))
                        }
                        className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3 text-sm font-medium text-[#1C1C1E]"
                      >
                        {blueprint.paymentMethods.map((pm) => (
                          <option key={pm} value={pm}>
                            {pm}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="tx-due-date" className="block text-xs font-semibold text-[#1C1C1E]">
                        Due / Target Date
                      </label>
                      <input
                        id="tx-due-date"
                        type="date"
                        value={form.dueDate}
                        onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                        className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3.5 text-sm font-medium text-[#1C1C1E]"
                      />
                    </div>
                  </div>

                  {tabExtraFields.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {tabExtraFields.map(renderExtraField)}
                    </div>
                  )}

                  <div>
                    <label htmlFor="tx-memo" className="block text-xs font-semibold text-[#1C1C1E]">
                      Audit Memo &amp; Customer/Vendor Notes
                    </label>
                    <textarea
                      id="tx-memo"
                      rows={3}
                      value={form.memo}
                      onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
                      placeholder="Add clear explanation for your team or auditor..."
                      className="mt-1.5 w-full rounded-[12px] border border-[#D1D1D6] bg-white p-3 text-sm text-[#1C1C1E]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Totals Bar & Action Footer */}
          <div className="mt-6 flex flex-col gap-4 border-t border-[#E5E5EA] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div>
                <span className="text-[#5E5E64]">Subtotal: </span>
                <span className="font-mono font-bold text-[#1C1C1E]">
                  {formatNaira(computedTotals.subtotal)}
                </span>
              </div>
              {computedTotals.vatAmount > 0 && (
                <div>
                  <span className="text-[#5E5E64]">VAT (7.5%): </span>
                  <span className="font-mono font-bold text-[#00582E]">
                    +{formatNaira(computedTotals.vatAmount)}
                  </span>
                </div>
              )}
              {computedTotals.whtAmount > 0 && (
                <div>
                  <span className="text-[#5E5E64]">WHT ({form.whtRatePct}%): </span>
                  <span className="font-mono font-bold text-[#784507]">
                    -{formatNaira(computedTotals.whtAmount)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {mode === "edit" && (
                <button
                  type="button"
                  onClick={handleDeleteOrVoid}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#FECACA] bg-[#FEF2F2] px-4 py-2 text-xs font-semibold text-[#B91C1C] transition hover:bg-[#FEE2E2]"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Remove</span>
                </button>
              )}

              {mode === "create" && (
                <button
                  type="button"
                  onClick={() => void handleSave(true)}
                  disabled={saving}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-4 py-2 text-xs font-semibold text-[#1C1C1E] transition hover:bg-[#F2F2F7]"
                >
                  <Plus className="h-3.5 w-3.5 text-[#006838]" aria-hidden="true" />
                  <span>Save &amp; New</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => void handleSave(false)}
                disabled={saving}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#006838] px-5 py-2 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(0,104,56,0.24)] transition hover:bg-[#00582E] active:scale-[0.97]"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                <span>
                  {mode === "create"
                    ? blueprint.primaryActionLabel
                    : `Save ${meta.singularLabel}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
