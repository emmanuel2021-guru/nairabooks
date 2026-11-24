"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  FolderTree,
  Layers,
  Lock,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  ADMIN_MODULES,
  IFRS_ELEMENTS,
  formatBalanceWithSide,
  type AccountHierarchyLevel,
  type AdminRecord,
  type BalanceSide,
  type IfrsElement,
  type RecordModuleId,
} from "@/components/admin/admin-maintain-data";
import {
  MODULE_EDITOR_BLUEPRINTS,
  type EditorFieldSpec,
} from "@/components/admin/admin-editor-schemas";
import { AdminEditorTabWidget } from "@/components/admin/AdminEditorWidgets";
import {
  deleteAdminRecord,
  findAdminRecordById,
  loadAdminRecords,
  upsertAdminRecord,
} from "@/components/admin/admin-store";
import { getNextAdminRecordCode } from "@/lib/numbering-service";

export type CreationDetailMode = "simple" | "full";

interface EditorFormState {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly category: string;
  readonly balanceAmount: string;
  readonly balanceSide: BalanceSide;
  readonly contactOrNote: string;
  readonly isActive: boolean;
  readonly isProspect: boolean;
  readonly isSalesRep: boolean;
  readonly isCommissionable: boolean;
  readonly trackPhases: boolean;
  readonly accountLevel: AccountHierarchyLevel;
  readonly parentGroupCode: string;
  readonly ifrsElement: IfrsElement;
  readonly ifrsStandard: string;
  readonly details: Readonly<Record<string, string>>;
}

function stripDrCrSuffix(value: string): {
  readonly amount: string;
  readonly side?: BalanceSide;
} {
  const match = value.match(/^(.*?)\s+(DR|CR)\s*$/i);
  if (match) {
    return {
      amount: (match[1] ?? "").trim(),
      side: match[2]?.toUpperCase() === "CR" ? "CR" : "DR",
    };
  }
  return { amount: value.trim() };
}

function buildInitialDetails(
  moduleId: RecordModuleId,
  existing?: AdminRecord,
): Record<string, string> {
  const blueprint = MODULE_EDITOR_BLUEPRINTS[moduleId];
  const base: Record<string, string> = {};
  for (const field of blueprint.fields) {
    if (field.defaultValue !== undefined) {
      base[field.key] = field.defaultValue;
    }
  }
  return {
    ...base,
    ...(existing?.details ?? {}),
  };
}

function createInitialFormState(
  moduleId: RecordModuleId,
  mode: "create" | "edit",
  existing?: AdminRecord,
): EditorFormState {
  const blueprint = MODULE_EDITOR_BLUEPRINTS[moduleId];
  const nextCode =
    mode === "edit" && existing
      ? existing.code
      : getNextAdminRecordCode(moduleId, undefined, existing?.parentGroupCode);
  const parsedMetric = existing
    ? stripDrCrSuffix(existing.primaryMetricValue)
    : { amount: blueprint.supportsDebitCreditBalance ? "₦0.00" : "" };

  return {
    id:
      mode === "edit" && existing
        ? existing.id
        : `${moduleId}-${Date.now()}`,
    name: existing?.name ?? "",
    code: nextCode,
    category:
      existing?.category ??
      (moduleId === "accounts" ? "Assets — Non-Current" : "Standard"),
    balanceAmount: parsedMetric.amount,
    balanceSide:
      existing?.balanceSide ?? parsedMetric.side ?? blueprint.defaultBalanceSide,
    contactOrNote: existing?.contactOrNote ?? "",
    isActive: existing?.isActive ?? true,
    isProspect: existing?.details?.isProspect === "true",
    isSalesRep: existing?.details?.isSalesRep === "true",
    isCommissionable: existing?.details?.isCommissionable === "true",
    trackPhases: existing?.details?.trackPhases === "true",
    accountLevel: existing?.accountLevel ?? "INDIVIDUAL",
    parentGroupCode: existing?.parentGroupCode ?? "1500",
    ifrsElement: existing?.ifrsElement ?? "Assets — Non-Current",
    ifrsStandard: existing?.ifrsStandard ?? "IAS 16",
    details: buildInitialDetails(moduleId, existing),
  };
}

export function AdminRecordEditorWorkspace({
  mode,
  moduleId,
  recordId,
  onNavigateBack,
}: {
  readonly mode: "create" | "edit";
  readonly moduleId: RecordModuleId;
  readonly recordId?: string;
  readonly onNavigateBack?: (href: string) => void;
}) {
  const prefersReduced = useReducedMotion();
  const blueprint = MODULE_EDITOR_BLUEPRINTS[moduleId];
  const moduleMeta =
    ADMIN_MODULES.find((m) => m.id === moduleId) ?? ADMIN_MODULES[0];
  const backHref = `/admin?module=${moduleId}`;

  // Simple vs Full toggle applies strictly to creation; edit mode is ALWAYS locked to Full mode.
  const [creationMode, setCreationMode] = useState<CreationDetailMode>("simple");
  const isFullMode = mode === "edit" || creationMode === "full";

  const [allRecords, setAllRecords] = useState<readonly AdminRecord[]>(() =>
    loadAdminRecords(),
  );

  const initialRecord = useMemo(
    () => (mode === "edit" && recordId ? findAdminRecordById(recordId) : undefined),
    [mode, recordId],
  );

  const [form, setForm] = useState<EditorFormState>(() =>
    createInitialFormState(moduleId, mode, initialRecord),
  );
  const [activeTab, setActiveTab] = useState<string>(blueprint.tabs[0]?.id ?? "general");
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  useEffect(() => {
    const records = loadAdminRecords();
    setAllRecords(records);
    if (mode === "edit" && recordId) {
      const found = records.find((r) => r.id === recordId);
      if (found) {
        setForm(createInitialFormState(moduleId, "edit", found));
      }
    }
  }, [moduleId, mode, recordId]);

  const groupAccounts = useMemo(
    () =>
      allRecords
        .filter((r) => r.module === "accounts" && r.accountLevel === "GROUP")
        .sort((a, b) => a.code.localeCompare(b.code)),
    [allRecords],
  );

  const simpleFields = useMemo(
    () => blueprint.fields.filter((f) => f.includeInSimple),
    [blueprint.fields],
  );

  const currentTabSpec =
    blueprint.tabs.find((t) => t.id === activeTab) ?? blueprint.tabs[0];

  const activeTabFields = useMemo(
    () => blueprint.fields.filter((f) => f.tab === currentTabSpec?.id),
    [blueprint.fields, currentTabSpec?.id],
  );

  const completedDetailsCount = useMemo(() => {
    return Object.values(form.details).filter((v) => v.trim().length > 0).length;
  }, [form.details]);

  function updateDetail(key: string, value: string) {
    setForm((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        [key]: value,
      },
    }));
  }

  function buildRecordFromForm(): AdminRecord {
    const trimmedName = form.name.trim() || `New ${moduleMeta.singularLabel}`;
    const trimmedCode = form.code.trim() || `${blueprint.idPrefix}NEW`;

    const primaryMetricValue = blueprint.supportsDebitCreditBalance
      ? formatBalanceWithSide(form.balanceAmount || "₦0.00", form.balanceSide)
      : form.balanceAmount.trim() ||
        (moduleId === "inventory" && form.details.priceLevel1
          ? form.details.priceLevel1
          : "Active");

    const derivedContactNote =
      form.contactOrNote.trim() ||
      [
        form.details.email || form.details.workEmail || form.details.tinNumber,
        form.details.paymentTerms || form.details.whtType || form.details.cityStateZip,
      ]
        .filter(Boolean)
        .join(" · ") ||
      "Configured in Maintain Studio";

    const parentGroup = groupAccounts.find((g) => g.code === form.parentGroupCode);

    return {
      id: form.id,
      module: moduleId,
      name: trimmedName,
      code: trimmedCode,
      category:
        moduleId === "accounts"
          ? parentGroup?.ifrsElement ?? form.ifrsElement
          : form.category.trim() || form.details.department || "Standard",
      primaryMetricLabel: moduleMeta.metricLabel,
      primaryMetricValue,
      balanceSide: blueprint.supportsDebitCreditBalance ? form.balanceSide : undefined,
      contactOrNote:
        moduleId === "accounts"
          ? form.accountLevel === "GROUP"
            ? `${form.ifrsStandard} · IFRS Group Roll-Up Header`
            : `Individual · ${form.details.notes || form.ifrsStandard}`
          : derivedContactNote,
      isActive: form.isActive,
      details: {
        ...form.details,
        isProspect: String(form.isProspect),
        isSalesRep: String(form.isSalesRep),
        isCommissionable: String(form.isCommissionable),
        trackPhases: String(form.trackPhases),
      },
      ...(moduleId === "accounts"
        ? {
            accountLevel: form.accountLevel,
            parentGroupCode:
              form.accountLevel === "INDIVIDUAL" ? form.parentGroupCode : undefined,
            ifrsElement:
              form.accountLevel === "INDIVIDUAL" && parentGroup?.ifrsElement
                ? parentGroup.ifrsElement
                : form.ifrsElement,
            ifrsStandard: form.ifrsStandard.trim() || "IAS 1",
          }
        : {}),
    };
  }

  function handleSave(saveAndNew = false) {
    const savedRecord = buildRecordFromForm();
    const nextRecords = upsertAdminRecord(savedRecord);
    setAllRecords(nextRecords);

    if (saveAndNew && mode === "create") {
      setStatusBanner(
        `Saved "${savedRecord.name}" (${savedRecord.code}) — ready for your next ${moduleMeta.singularLabel}.`,
      );
      setForm(createInitialFormState(moduleId, "create"));
      return;
    }

    setStatusBanner(
      mode === "create"
        ? `Created "${savedRecord.name}" (${savedRecord.code}) in ${moduleMeta.label}.`
        : `Updated "${savedRecord.name}" (${savedRecord.code}) cleanly.`,
    );

    if (onNavigateBack && !saveAndNew) {
      window.setTimeout(() => {
        onNavigateBack(backHref);
      }, 450);
    }
  }

  function handleArchiveOrDelete() {
    if (mode !== "edit") return;
    const next = deleteAdminRecord(form.id);
    setAllRecords(next);
    setStatusBanner(`Removed "${form.name || form.code}" from ${moduleMeta.label}.`);
    if (onNavigateBack) {
      window.setTimeout(() => {
        onNavigateBack(backHref);
      }, 350);
    }
  }

  function renderFieldControl(field: EditorFieldSpec, idPrefix: string) {
    const inputId = `${idPrefix}-${field.key}`;
    const value = form.details[field.key] ?? "";

    const liveVendors = allRecords.filter((r) => r.module === "vendors");
    const liveCustomers = allRecords.filter((r) => r.module === "customers");
    const liveAccounts = allRecords.filter((r) => r.module === "accounts" && r.accountLevel !== "GROUP");
    const liveEmployees = allRecords.filter((r) => r.module === "employees");
    const liveInventory = allRecords.filter((r) => r.module === "inventory");

    return (
      <div
        key={field.key}
        className={field.width === "full" || field.type === "textarea" ? "sm:col-span-2" : ""}
      >
        <label htmlFor={inputId} className="block text-xs font-semibold text-[#1C1C1E]">
          {field.label}
        </label>
        {field.key === "preferredVendor" || field.key === "vendor" ? (
          <div className="mt-1.5 space-y-1">
            <select
              id={inputId}
              value={value}
              onChange={(e) => updateDetail(field.key, e.target.value)}
              className="min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3 text-sm text-[#1C1C1E] focus:border-[#006838] focus:outline-none focus:ring-2 focus:ring-[#006838]/20"
            >
              <option value="">-- Pick Vendor ({liveVendors.length} registered) --</option>
              {liveVendors.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.code} — {v.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={value}
              onChange={(e) => updateDetail(field.key, e.target.value)}
              placeholder="Or type custom vendor name..."
              className="min-h-[36px] w-full rounded-[10px] border border-[#E5E5EA] bg-white px-3 text-xs text-[#1C1C1E]"
            />
          </div>
        ) : field.key === "customer" ? (
          <div className="mt-1.5 space-y-1">
            <select
              id={inputId}
              value={value}
              onChange={(e) => updateDetail(field.key, e.target.value)}
              className="min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3 text-sm text-[#1C1C1E] focus:border-[#006838] focus:outline-none focus:ring-2 focus:ring-[#006838]/20"
            >
              <option value="">-- Pick Customer ({liveCustomers.length} registered) --</option>
              {liveCustomers.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={value}
              onChange={(e) => updateDetail(field.key, e.target.value)}
              placeholder="Or type custom customer name..."
              className="min-h-[36px] w-full rounded-[10px] border border-[#E5E5EA] bg-white px-3 text-xs text-[#1C1C1E]"
            />
          </div>
        ) : (field.key.toLowerCase().includes("account") || field.key === "salesGlAccount" || field.key === "expenseGlAccount") && liveAccounts.length > 0 ? (
          <select
            id={inputId}
            value={value}
            onChange={(e) => updateDetail(field.key, e.target.value)}
            className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3 text-sm text-[#1C1C1E] focus:border-[#006838] focus:outline-none focus:ring-2 focus:ring-[#006838]/20"
          >
            <option value="">-- Pick Chart of Account ({liveAccounts.length} accounts) --</option>
            {liveAccounts.map((acc) => (
              <option key={acc.id} value={`${acc.code} ${acc.name}`}>
                {acc.code} — {acc.name} ({acc.category})
              </option>
            ))}
          </select>
        ) : field.key === "salesRep" && liveEmployees.length > 0 ? (
          <select
            id={inputId}
            value={value}
            onChange={(e) => updateDetail(field.key, e.target.value)}
            className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3 text-sm text-[#1C1C1E] focus:border-[#006838] focus:outline-none focus:ring-2 focus:ring-[#006838]/20"
          >
            <option value="">-- Pick Sales Rep / Employee ({liveEmployees.length}) --</option>
            {liveEmployees.map((emp) => (
              <option key={emp.id} value={emp.name}>
                {emp.code} — {emp.name}
              </option>
            ))}
          </select>
        ) : field.key === "itemId" && liveInventory.length > 0 ? (
          <select
            id={inputId}
            value={value}
            onChange={(e) => updateDetail(field.key, e.target.value)}
            className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3 text-sm text-[#1C1C1E] focus:border-[#006838] focus:outline-none focus:ring-2 focus:ring-[#006838]/20"
          >
            <option value="">-- Pick Inventory Item ({liveInventory.length}) --</option>
            {liveInventory.map((item) => (
              <option key={item.id} value={item.code}>
                {item.code} — {item.name}
              </option>
            ))}
          </select>
        ) : field.type === "select" ? (
          <select
            id={inputId}
            value={value}
            onChange={(e) => updateDetail(field.key, e.target.value)}
            className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3 text-sm text-[#1C1C1E] focus:border-[#006838] focus:outline-none focus:ring-2 focus:ring-[#006838]/20"
          >
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : field.type === "textarea" ? (
          <textarea
            id={inputId}
            rows={3}
            value={value}
            placeholder={field.placeholder}
            onChange={(e) => updateDetail(field.key, e.target.value)}
            className="mt-1.5 w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3.5 py-2.5 text-sm text-[#1C1C1E] placeholder:text-[#636369] focus:border-[#006838] focus:outline-none focus:ring-2 focus:ring-[#006838]/20"
          />
        ) : (
          <input
            id={inputId}
            type={field.type}
            value={value}
            placeholder={field.placeholder}
            onChange={(e) => updateDetail(field.key, e.target.value)}
            className={`mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3.5 text-sm text-[#1C1C1E] placeholder:text-[#636369] focus:border-[#006838] focus:outline-none focus:ring-2 focus:ring-[#006838]/20 ${
              field.type === "number" ? "font-mono tabular-nums" : ""
            }`}
          />
        )}
        {field.helperText && (
          <p className="mt-1 text-[11px] text-[#5E5E64]">{field.helperText}</p>
        )}
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#F2F2F7] pb-20">
        <main className="mx-auto max-w-5xl space-y-5 px-4 pt-5 sm:px-8">
          {/* Top Minimal Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={backHref}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#E5E5EA] bg-white px-4 py-2 text-xs font-semibold text-[#1C1C1E] shadow-sm transition hover:bg-[#FAFAFC]"
            >
              <ArrowLeft className="h-4 w-4 text-[#006838]" aria-hidden="true" />
              <span>Back to {moduleMeta.label}</span>
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              {mode === "create" ? (
                <div
                  role="group"
                  aria-label="Creation Mode Toggle"
                  data-testid="creation-mode-toggle"
                  className="inline-flex rounded-full border border-[#E5E5EA] bg-white p-1 shadow-sm"
                >
                  {(
                    [
                      { id: "simple", label: "Simple Creation" },
                      { id: "full", label: "Full Creation" },
                    ] as const
                  ).map((option) => {
                    const selected = creationMode === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setCreationMode(option.id)}
                        className={`relative min-h-[38px] rounded-full px-3.5 text-xs font-semibold transition ${
                          selected ? "text-white" : "text-[#5E5E64] hover:text-[#1C1C1E]"
                        }`}
                      >
                        {selected && (
                          <motion.span
                            layoutId="editor-creation-mode-pill"
                            transition={{ type: "spring", stiffness: 360, damping: 28 }}
                            className="absolute inset-0 rounded-full bg-[#006838]"
                          />
                        )}
                        <span className="relative z-10">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Badge
                  variant="outline"
                  data-testid="edit-full-mode-badge"
                  className="min-h-[38px] gap-1.5 rounded-full border-[#E5E5EA] bg-white px-3.5 text-xs font-semibold text-[#1C1C1E]"
                >
                  <Lock className="h-3.5 w-3.5 text-[#006838]" aria-hidden="true" />
                  <span>Full Ledger Mode</span>
                </Badge>
              )}
            </div>
          </div>

          {/* Live Confirmation Toast */}
          <AnimatePresence>
            {statusBanner && (
              <motion.div
                role="status"
                aria-live="polite"
                initial={prefersReduced ? false : { opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: "spring", stiffness: 340, damping: 26 }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#006838]/30 bg-[#E6F5ED] px-4 py-3 text-xs font-semibold text-[#00582E]"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{statusBanner}</span>
                </div>
                <Link
                  href={backHref}
                  className="rounded-full bg-[#006838] px-3.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#00582E]"
                >
                  Return to {moduleMeta.label} List
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compact Cupertino Identity Hero Card */}
          <motion.section
            initial={prefersReduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 25 }}
            aria-labelledby="editor-page-heading"
            className="rounded-[24px] border border-[#E5E5EA] bg-white p-5 shadow-[0_6px_24px_rgba(28,28,30,0.05)] sm:p-6"
          >
            <div className="flex flex-col gap-4 border-b border-[#E5E5EA] pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="emerald" className="text-[11px]">
                    <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                    {mode === "create"
                      ? creationMode === "simple"
                        ? "Quick Setup"
                        : "Full Setup"
                      : "Full Record Editor"}
                  </Badge>
                  <span className="font-mono text-xs font-bold text-[#5E5E64]">
                    {form.code || `${blueprint.idPrefix}NEW`}
                  </span>
                </div>
                <h1
                  id="editor-page-heading"
                  className="text-2xl font-bold tracking-[-0.03em] text-[#1C1C1E]"
                >
                  {mode === "create"
                    ? `New ${moduleMeta.singularLabel}`
                    : `Edit ${moduleMeta.singularLabel}${form.name ? ` · ${form.name}` : ""}`}
                </h1>
                <p className="max-w-2xl text-xs text-[#5E5E64]">
                  {isFullMode ? blueprint.fullIntro : blueprint.simpleIntro}
                </p>
              </div>

              {/* Right Quick Status & Live Balance Pill */}
              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                {blueprint.supportsDebitCreditBalance && (
                  <div className="rounded-[16px] border border-[#E5E5EA] bg-[#FAFAFC] px-3.5 py-2 text-left sm:text-right">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#5E5E64]">
                      Ledger Balance
                    </span>
                    <span className="font-mono text-sm font-bold tabular-nums text-[#1C1C1E]">
                      {formatBalanceWithSide(form.balanceAmount || "₦0.00", form.balanceSide)}
                    </span>
                  </div>
                )}
                <span className="text-[11px] font-medium text-[#5E5E64]">
                  {completedDetailsCount} detail fields configured
                </span>
              </div>
            </div>

            {/* Core Identity Strip (Always visible in both Simple and Full modes) */}
            <form
              id="admin-record-editor-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSave(false);
              }}
              className="mt-5 space-y-6"
            >
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#5E5E64]">
                  Core Ledger Identity
                </h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-12">
                  <div className="sm:col-span-3">
                    <label
                      htmlFor="editor-code"
                      className="block text-xs font-semibold text-[#1C1C1E]"
                    >
                      {moduleMeta.codeLabel}
                    </label>
                    <input
                      id="editor-code"
                      required
                      value={form.code}
                      onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                      className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3.5 font-mono text-sm font-semibold text-[#1C1C1E] focus:border-[#006838] focus:outline-none focus:ring-2 focus:ring-[#006838]/20"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label
                      htmlFor="editor-name"
                      className="block text-xs font-semibold text-[#1C1C1E]"
                    >
                      {moduleMeta.singularLabel} Name
                    </label>
                    <input
                      id="editor-name"
                      required
                      placeholder={`Enter ${moduleMeta.singularLabel.toLowerCase()} name`}
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3.5 text-sm font-medium text-[#1C1C1E] placeholder:text-[#636369] focus:border-[#006838] focus:outline-none focus:ring-2 focus:ring-[#006838]/20"
                    />
                  </div>

                  {moduleId === "accounts" ? (
                    <div className="sm:col-span-4">
                      <label
                        htmlFor="editor-account-level"
                        className="block text-xs font-semibold text-[#1C1C1E]"
                      >
                        IFRS Account Level
                      </label>
                      <select
                        id="editor-account-level"
                        value={form.accountLevel}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            accountLevel: e.target.value as AccountHierarchyLevel,
                          }))
                        }
                        className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3 text-sm text-[#1C1C1E] focus:border-[#006838] focus:outline-none focus:ring-2 focus:ring-[#006838]/20"
                      >
                        <option value="INDIVIDUAL">Individual Account (Postable)</option>
                        <option value="GROUP">Group Account (Roll-up Header)</option>
                      </select>
                    </div>
                  ) : (
                    <div className="sm:col-span-4">
                      <label
                        htmlFor="editor-category"
                        className="block text-xs font-semibold text-[#1C1C1E]"
                      >
                        {moduleMeta.categoryLabel}
                      </label>
                      <input
                        id="editor-category"
                        value={form.category}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, category: e.target.value }))
                        }
                        className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3.5 text-sm text-[#1C1C1E] focus:border-[#006838] focus:outline-none focus:ring-2 focus:ring-[#006838]/20"
                      />
                    </div>
                  )}

                  {/* IFRS Parent Group / Standard row for Accounts */}
                  {moduleId === "accounts" && (
                    <>
                      <div className="sm:col-span-6">
                        {form.accountLevel === "INDIVIDUAL" ? (
                          <>
                            <label
                              htmlFor="editor-parent-group"
                              className="block text-xs font-semibold text-[#1C1C1E]"
                            >
                              Parent Group Account
                            </label>
                            <select
                              id="editor-parent-group"
                              value={form.parentGroupCode}
                              onChange={(e) => {
                                const parent = groupAccounts.find(
                                  (g) => g.code === e.target.value,
                                );
                                setForm((f) => ({
                                  ...f,
                                  parentGroupCode: e.target.value,
                                  ifrsElement: parent?.ifrsElement ?? f.ifrsElement,
                                  ifrsStandard: parent?.ifrsStandard ?? f.ifrsStandard,
                                }));
                              }}
                              className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3 text-sm text-[#1C1C1E]"
                            >
                              {groupAccounts.map((grp) => (
                                <option key={grp.code} value={grp.code}>
                                  {grp.code} — {grp.name}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <>
                            <label
                              htmlFor="editor-ifrs-element"
                              className="block text-xs font-semibold text-[#1C1C1E]"
                            >
                              IFRS Element Classification
                            </label>
                            <select
                              id="editor-ifrs-element"
                              value={form.ifrsElement}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  ifrsElement: e.target.value as IfrsElement,
                                }))
                              }
                              className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3 text-sm text-[#1C1C1E]"
                            >
                              {IFRS_ELEMENTS.map((el) => (
                                <option key={el} value={el}>
                                  {el}
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                      </div>

                      <div className="sm:col-span-6">
                        <label
                          htmlFor="editor-ifrs-standard"
                          className="block text-xs font-semibold text-[#1C1C1E]"
                        >
                          IFRS Standard Reference
                        </label>
                        <input
                          id="editor-ifrs-standard"
                          value={form.ifrsStandard}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, ifrsStandard: e.target.value }))
                          }
                          className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3.5 font-mono text-sm text-[#1C1C1E]"
                        />
                      </div>
                    </>
                  )}

                  {/* Opening / Current Balance + Debit/Credit toggle or Primary Metric */}
                  <div className="sm:col-span-6">
                    <label
                      htmlFor="editor-balance-amount"
                      className="block text-xs font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]"
                    >
                      {blueprint.supportsDebitCreditBalance
                        ? "Current / Opening Balance (₦)"
                        : moduleId === "inventory"
                          ? "Total Stock Valuation / Cost on Hand (₦)"
                          : moduleMeta.metricLabel}
                    </label>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <input
                        id="editor-balance-amount"
                        value={form.balanceAmount}
                        placeholder={moduleId === "inventory" ? "e.g. ₦1,450,000 (total inventory value)" : "e.g. ₦1,450,000"}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, balanceAmount: e.target.value }))
                        }
                        className="min-h-[44px] flex-1 rounded-[14px] border border-[#D1D1D6] dark:border-[#38383A] bg-[#FAFAFC] dark:bg-[#1C1C1E] px-3.5 font-mono text-sm text-[#1C1C1E] dark:text-[#F2F2F7]"
                      />
                      {blueprint.supportsDebitCreditBalance && (
                        <div
                          role="group"
                          aria-label="Debit or Credit Balance Side"
                          className="inline-flex rounded-full border border-[#E5E5EA] bg-[#FAFAFC] p-1"
                        >
                          {(["DR", "CR"] as const).map((side) => {
                            const active = form.balanceSide === side;
                            return (
                              <button
                                key={side}
                                type="button"
                                aria-pressed={active}
                                onClick={() =>
                                  setForm((f) => ({ ...f, balanceSide: side }))
                                }
                                className={`min-h-[36px] rounded-full px-3 text-xs font-bold transition ${
                                  active
                                    ? side === "DR"
                                      ? "bg-[#006838] text-white"
                                      : "bg-[#92400E] text-white"
                                    : "text-[#5E5E64] hover:text-[#1C1C1E]"
                                }`}
                              >
                                {side === "DR" ? "DR (Debit)" : "CR (Credit)"}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Flags Strip (Clean Switches) */}
                  <div className="flex flex-wrap items-center gap-4 sm:col-span-6 sm:pt-5">
                    <div className="flex items-center gap-2.5 rounded-full border border-[#E5E5EA] bg-[#FAFAFC] px-3.5 py-2">
                      <Switch
                        checked={form.isActive}
                        onCheckedChange={(checked) =>
                          setForm((f) => ({ ...f, isActive: checked }))
                        }
                        aria-label="Active record status"
                      />
                      <span className="text-xs font-semibold text-[#1C1C1E]">
                        {form.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {blueprint.supportsProspectToggle && (
                      <div className="flex items-center gap-2.5 rounded-full border border-[#E5E5EA] bg-[#FAFAFC] px-3.5 py-2">
                        <Switch
                          checked={form.isProspect}
                          onCheckedChange={(checked) =>
                            setForm((f) => ({ ...f, isProspect: checked }))
                          }
                          aria-label="Mark customer as prospect"
                        />
                        <span className="text-xs font-semibold text-[#1C1C1E]">
                          Prospect
                        </span>
                      </div>
                    )}

                    {blueprint.supportsSalesRepToggle && (
                      <div className="flex items-center gap-2.5 rounded-full border border-[#E5E5EA] bg-[#FAFAFC] px-3.5 py-2">
                        <Switch
                          checked={form.isSalesRep}
                          onCheckedChange={(checked) =>
                            setForm((f) => ({ ...f, isSalesRep: checked }))
                          }
                          aria-label="Employee is a sales representative"
                        />
                        <span className="text-xs font-semibold text-[#1C1C1E]">
                          Sales Rep
                        </span>
                      </div>
                    )}

                    {blueprint.supportsCommissionToggle && (
                      <div className="flex items-center gap-2.5 rounded-full border border-[#E5E5EA] bg-[#FAFAFC] px-3.5 py-2">
                        <Switch
                          checked={form.isCommissionable}
                          onCheckedChange={(checked) =>
                            setForm((f) => ({ ...f, isCommissionable: checked }))
                          }
                          aria-label="Item subject to sales commission"
                        />
                        <span className="text-xs font-semibold text-[#1C1C1E]">
                          Commissionable
                        </span>
                      </div>
                    )}

                    {blueprint.supportsPhasesToggle && (
                      <div className="flex items-center gap-2.5 rounded-full border border-[#E5E5EA] bg-[#FAFAFC] px-3.5 py-2">
                        <Switch
                          checked={form.trackPhases}
                          onCheckedChange={(checked) =>
                            setForm((f) => ({ ...f, trackPhases: checked }))
                          }
                          aria-label="Use phases to track job"
                        />
                        <span className="text-xs font-semibold text-[#1C1C1E]">
                          Track Phases
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Animated Simple vs Full Form Body */}
              {!isFullMode ? (
                <motion.div
                  key="simple-pane"
                  initial={prefersReduced ? false : { y: 8 }}
                  animate={{ y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  data-testid="simple-creation-pane"
                  className="rounded-[20px] border border-[#E5E5EA] bg-[#FAFAFC] p-5"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold text-[#1C1C1E]">
                        Simple Creation Essentials
                      </h2>
                      <p className="text-xs text-[#5E5E64]">
                        Fill these essentials now—or toggle Full Creation for every advanced enterprise tab.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreationMode("full")}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#006838]/30 bg-white px-3.5 text-xs font-semibold text-[#00582E] transition hover:bg-[#E6F5ED]"
                    >
                      <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Switch to Full Creation</span>
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {simpleFields.map((field) => renderFieldControl(field, "simple"))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="full-pane"
                  initial={prefersReduced ? false : { y: 8 }}
                  animate={{ y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  data-testid="full-editor-pane"
                  className="space-y-4"
                >
                  {/* Animated Horizontal Tab Bar */}
                  <div
                    role="tablist"
                    aria-label={`${moduleMeta.singularLabel} Ledger Sections`}
                    className="flex flex-wrap items-center gap-1.5 rounded-[18px] border border-[#E5E5EA] bg-[#FAFAFC] p-1.5"
                  >
                    {blueprint.tabs.map((tab) => {
                      const isSelected = currentTabSpec?.id === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={isSelected}
                          onClick={() => setActiveTab(tab.id)}
                          className={`relative min-h-[40px] rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                            isSelected
                              ? "text-white"
                              : "text-[#5E5E64] hover:text-[#1C1C1E]"
                          }`}
                        >
                          {isSelected && (
                            <motion.span
                              layoutId="editor-tab-indicator"
                              transition={{ type: "spring", stiffness: 360, damping: 28 }}
                              className="absolute inset-0 rounded-full bg-[#1C1C1E]"
                            />
                          )}
                          <span className="relative z-10">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab Panel Body */}
                  {currentTabSpec && (
                    <motion.div
                      key={currentTabSpec.id}
                      role="tabpanel"
                      aria-label={currentTabSpec.label}
                      initial={prefersReduced ? false : { y: 6 }}
                      animate={{ y: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 26 }}
                      className="rounded-[20px] border border-[#E5E5EA] bg-white p-5"
                    >
                      <div className="mb-4 flex items-center justify-between gap-2 border-b border-[#E5E5EA] pb-3">
                        <div>
                          <h2 className="text-sm font-bold text-[#1C1C1E]">
                            {currentTabSpec.label}
                          </h2>
                          <p className="text-xs text-[#5E5E64]">{currentTabSpec.hint}</p>
                        </div>
                        {moduleId === "accounts" && (
                          <Badge variant="outline" className="text-[11px]">
                            <FolderTree className="mr-1 h-3 w-3 text-[#006838]" aria-hidden="true" />
                            IFRS Tree Ready
                          </Badge>
                        )}
                      </div>

                      {currentTabSpec.widget && (
                        <AdminEditorTabWidget
                          widget={currentTabSpec.widget}
                          balanceAmount={form.balanceAmount}
                          balanceSide={form.balanceSide}
                          details={form.details}
                          onUpdateDetail={updateDetail}
                        />
                      )}

                      {activeTabFields.length > 0 && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {activeTabFields.map((field) =>
                            renderFieldControl(field, `full-${currentTabSpec.id}`),
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Sticky Cupertino Bottom Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E5EA] pt-5">
                <div>
                  {mode === "edit" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleArchiveOrDelete}
                      className="rounded-full text-[#B91C1C] hover:bg-[#FEF2F2]"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      <span>Remove Record</span>
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    href={backHref}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#D1D1D6] bg-white px-5 text-xs font-semibold text-[#1C1C1E] transition hover:bg-[#FAFAFC]"
                  >
                    Cancel
                  </Link>

                  {mode === "create" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSave(true)}
                      className="rounded-full"
                    >
                      <Plus className="h-4 w-4 text-[#006838]" aria-hidden="true" />
                      <span>Save &amp; New</span>
                    </Button>
                  )}

                  <Button type="submit" variant="emerald" className="rounded-full px-6">
                    <Save className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {mode === "create"
                        ? `Create ${moduleMeta.singularLabel}`
                        : `Save ${moduleMeta.singularLabel}`}
                    </span>
                  </Button>
                </div>
              </div>
            </form>
          </motion.section>
        </main>
      </div>
    </MotionConfig>
  );
}
