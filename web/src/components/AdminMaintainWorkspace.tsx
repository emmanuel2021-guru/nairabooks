"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import {
  Archive,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderTree,
  Layers,
  Mail,
  Pencil,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useWorkspaceMode } from "@/state/workspace-mode";
import { renderWithNairaSign } from "@/components/ui/NairaAmount";
import {
  ADMIN_MODULES,
  ADMIN_PILLARS,
  formatNairaAmount,
  IFRS_ELEMENTS,
  parseNairaNumeric,
  type AdminModuleId,
  type AdminPillarId,
  type AdminRecord,
  type CompanySettingsBundle,
  type IfrsElement,
} from "@/components/admin/admin-maintain-data";
import {
  ADMIN_STORE_EVENT,
  loadAdminRecords,
  loadCompanySettings,
  saveCompanySettingsInStore,
  toggleAdminRecordActiveInStore,
} from "@/components/admin/admin-store";
import { withLivePartyBalances } from "@/components/admin/party-balances";
import {
  loadTransactions,
  TRANSACTIONS_STORE_EVENT,
} from "@/components/transactions/transactions-store";

const DEMO_WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";

function renderMetricWithSide(label: string, value: string, side?: "DR" | "CR") {
  const detectedSide =
    side ?? (/\bDR\b/i.test(value) ? "DR" : /\bCR\b/i.test(value) ? "CR" : undefined);

  return (
    <div className="text-left sm:text-right">
      <p className="text-[10px] font-medium text-[#5E5E64]">{label}</p>
      <div className="flex items-center gap-1.5 sm:justify-end">
        <p className="font-mono text-sm font-bold tabular-nums text-[#1C1C1E]">
          {renderWithNairaSign(value)}
        </p>
        {detectedSide && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              detectedSide === "DR"
                ? "bg-[#E6F5ED] text-[#00582E]"
                : "bg-[#FEF3C7] text-[#92400E]"
            }`}
          >
            {detectedSide === "DR" ? "Debit" : "Credit"}
          </span>
        )}
      </div>
    </div>
  );
}

export function AdminMaintainWorkspace({
  workspaceId,
  workspaceName,
  workspaceRc,
  businessType,
  initialModule,
}: {
  readonly workspaceId?: string;
  readonly workspaceName: string;
  readonly workspaceRc: string;
  readonly businessType?: string;
  readonly initialModule?: AdminModuleId;
}) {
  const { mode } = useWorkspaceMode();
  const prefersReduced = useReducedMotion();

  const effectiveWsId =
    workspaceId ??
    (workspaceName === "Lagos Trading & Hospitality Ltd"
      ? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001"
      : undefined);

  useEffect(() => {
    if (effectiveWsId && typeof window !== "undefined") {
      try {
        window.localStorage.setItem("nairabooks_active_workspace", effectiveWsId);
        if (businessType) {
          window.localStorage.setItem(`nairabooks_workspace_business_type_${effectiveWsId}`, businessType);
          window.sessionStorage.setItem(`nairabooks_workspace_business_type_${effectiveWsId}`, businessType);
        }
      } catch {
        // Ignore
      }
    }
  }, [effectiveWsId, businessType]);

  const resolvedInitialMeta =
    ADMIN_MODULES.find((m) => m.id === initialModule) ?? ADMIN_MODULES[0];

  const [activePillar, setActivePillar] = useState<AdminPillarId>(resolvedInitialMeta.pillar);
  const [activeModule, setActiveModule] = useState<AdminModuleId>(resolvedInitialMeta.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [storedRecords, setRecords] = useState<readonly AdminRecord[]>(() =>
    loadAdminRecords(effectiveWsId, businessType),
  );
  const [transactions, setTransactions] = useState(() => loadTransactions(effectiveWsId));
  useEffect(() => {
    function syncTransactions() {
      setTransactions(loadTransactions(effectiveWsId));
    }
    syncTransactions();
    window.addEventListener(TRANSACTIONS_STORE_EVENT, syncTransactions);
    return () => window.removeEventListener(TRANSACTIONS_STORE_EVENT, syncTransactions);
  }, [effectiveWsId]);
  // Customers and vendors show their opening balance plus every posted transaction.
  // (The demo company's sample balances already include its sample history.)
  const records = useMemo(() => {
    let wsId = effectiveWsId;
    if (!wsId && typeof window !== "undefined") {
      try {
        wsId = window.localStorage.getItem("nairabooks_active_workspace") ?? undefined;
      } catch {
        // Storage unavailable
      }
    }
    const isDemoCompany = !wsId || wsId === DEMO_WORKSPACE_ID;
    return isDemoCompany ? storedRecords : withLivePartyBalances(storedRecords, transactions);
  }, [storedRecords, transactions, effectiveWsId]);
  const [companySettings, setCompanySettings] = useState<CompanySettingsBundle>(() =>
    loadCompanySettings(workspaceName, workspaceRc, effectiveWsId),
  );

  const [ifrsFilter, setIfrsFilter] = useState<"All" | IfrsElement>("All");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isGroupedView, setIsGroupedView] = useState<boolean>(true);
  const [recentlySavedId, setRecentlySavedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    function syncFromStore() {
      setRecords(loadAdminRecords(effectiveWsId, businessType));
      setCompanySettings(loadCompanySettings(workspaceName, workspaceRc, effectiveWsId));
    }
    syncFromStore();
    window.addEventListener(ADMIN_STORE_EVENT, syncFromStore);
    return () => window.removeEventListener(ADMIN_STORE_EVENT, syncFromStore);
  }, [effectiveWsId, workspaceName, workspaceRc, businessType]);

  const currentModuleMeta =
    ADMIN_MODULES.find((m) => m.id === activeModule) ?? ADMIN_MODULES[0];

  const pillarModules = useMemo(
    () => ADMIN_MODULES.filter((m) => m.pillar === activePillar),
    [activePillar],
  );

  const activeRecordsCount = useMemo(
    () => records.filter((r) => r.isActive).length,
    [records],
  );

  const inactiveRecordsCount = records.length - activeRecordsCount;
  const setupHealthPct =
    records.length === 0
      ? 0
      : Math.min(100, Math.max(10, 82 + Math.min(18, activeRecordsCount - 20)));

  const visibleRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const base =
      activeModule === "inactive"
        ? records
        : records.filter((r) => r.module === activeModule);

    if (!query) return base;
    return base.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.code.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query) ||
        r.contactOrNote.toLowerCase().includes(query) ||
        (r.ifrsStandard ?? "").toLowerCase().includes(query),
    );
  }, [records, activeModule, searchQuery]);

  const accountsHierarchy = useMemo(() => {
    if (activeModule !== "accounts") {
      return { groups: [], orphans: [] as AdminRecord[] };
    }
    const allAccountRecords = records.filter((r) => r.module === "accounts");
    const query = searchQuery.trim().toLowerCase();

    const groups = allAccountRecords
      .filter((r) => r.accountLevel === "GROUP")
      .filter((g) => ifrsFilter === "All" || g.ifrsElement === ifrsFilter)
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((group) => {
        const allChildren = allAccountRecords
          .filter((r) => r.accountLevel !== "GROUP" && r.parentGroupCode === group.code)
          .sort((a, b) => a.code.localeCompare(b.code));
        const filteredChildren = !query
          ? allChildren
          : allChildren.filter(
              (c) =>
                c.name.toLowerCase().includes(query) ||
                c.code.toLowerCase().includes(query) ||
                (c.ifrsStandard ?? "").toLowerCase().includes(query) ||
                c.contactOrNote.toLowerCase().includes(query),
            );
        const groupMatchesQuery =
          !query ||
          group.name.toLowerCase().includes(query) ||
          group.code.toLowerCase().includes(query) ||
          (group.ifrsStandard ?? "").toLowerCase().includes(query);

        const rolledUpTotal = allChildren
          .filter((c) => c.isActive)
          .reduce((sum, c) => sum + parseNairaNumeric(c.primaryMetricValue), 0);

        return {
          group,
          children: groupMatchesQuery && filteredChildren.length === 0 ? allChildren : filteredChildren,
          totalChildrenCount: allChildren.length,
          rolledUpMetric:
            allChildren.length > 0 ? formatNairaAmount(rolledUpTotal) : group.primaryMetricValue,
          shouldShow: groupMatchesQuery || filteredChildren.length > 0,
        };
      })
      .filter((entry) => entry.shouldShow);

    const knownGroupCodes = new Set(allAccountRecords.filter((r) => r.accountLevel === "GROUP").map((g) => g.code));
    const orphans = visibleRecords.filter(
      (r) => r.accountLevel !== "GROUP" && (!r.parentGroupCode || !knownGroupCodes.has(r.parentGroupCode)),
    );

    return { groups, orphans };
  }, [activeModule, records, searchQuery, ifrsFilter, visibleRecords]);

  const isGroupableModule = ["customers", "vendors", "employees", "inventory"].includes(activeModule);

  const categoryGroups = useMemo(() => {
    if (!isGroupableModule) return [];
    const map: Record<string, AdminRecord[]> = {};
    for (const rec of visibleRecords) {
      const key = rec.category?.trim() || "General / Uncategorized";
      if (!map[key]) map[key] = [];
      map[key].push(rec);
    }
    return Object.entries(map).map(([category, items]) => {
      let totalNumeric = 0;
      let hasNaira = false;
      for (const item of items) {
        if (item.primaryMetricValue.includes("₦")) {
          hasNaira = true;
          totalNumeric += parseNairaNumeric(item.primaryMetricValue);
        }
      }
      return {
        category,
        items,
        count: items.length,
        subtotalFormatted: hasNaira ? formatNairaAmount(totalNumeric) : null,
      };
    });
  }, [visibleRecords, isGroupableModule]);

  function handleSelectPillar(pillarId: AdminPillarId) {
    setActivePillar(pillarId);
    const firstMod = ADMIN_MODULES.find((m) => m.pillar === pillarId);
    if (firstMod) {
      setActiveModule(firstMod.id);
    }
  }

  function handleToggleRecordActive(recordId: string) {
    const { records: nextRecords, updated } = toggleAdminRecordActiveInStore(recordId, effectiveWsId);
    setRecords(nextRecords);
    setRecentlySavedId(recordId);
    if (updated) {
      setToastMessage(
        updated.isActive
          ? `Restored "${updated.name}" to Active status.`
          : `Marked "${updated.name}" as Inactive safely.`,
      );
    }
  }

  function handleToggleGroupCollapse(groupCode: string) {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupCode]: !prev[groupCode],
    }));
  }

  function handleSaveCompanySettings(e: React.FormEvent, sectionLabel: string) {
    e.preventDefault();
    saveCompanySettingsInStore(companySettings, effectiveWsId);
    setToastMessage(`Saved ${sectionLabel} for ${companySettings.legalName}.`);
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-transparent text-[#1C1C1E]">
        <main
          id="main-content"
          className="mx-auto max-w-6xl space-y-4 px-4 py-4 pb-sticky-clearance sm:px-6 sm:py-5"
        >
          {/* Compact Inline Header */}
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E5EA] pb-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-xl font-bold tracking-[-0.02em] text-[#1C1C1E] sm:text-2xl">
                Maintain &amp; Admin Studio
              </h1>
              <span className="font-mono text-xs text-[#5E5E64]">
                {companySettings.legalName} &middot; {companySettings.rcNumber}
              </span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E5EA] bg-white px-3 py-1 text-xs shadow-xs">
              <span className="inline-flex h-2 w-2 rounded-full bg-[#006838]" aria-hidden="true" />
              <span className="font-mono font-bold text-[#1C1C1E]">{setupHealthPct}%</span>
              <span className="text-[#5E5E64]">
                {activeRecordsCount} active &middot; {inactiveRecordsCount} paused
              </span>
            </div>
          </header>

          {/* Celebratory Live Status Banner */}
          {toastMessage ? (
            <motion.div
              key={toastMessage}
              role="status"
              aria-live="polite"
              initial={prefersReduced ? false : { y: -8, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 360, damping: 24 }}
              className="flex items-center justify-between gap-3 rounded-[18px] border border-[#006838]/30 bg-[#E6F5ED] px-4 py-3 text-xs font-semibold text-[#00582E]"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#006838]" aria-hidden="true" />
                {toastMessage}
              </span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="min-h-[32px] rounded-full px-3 text-[11px] font-bold text-[#00582E] hover:bg-white/70"
              >
                Dismiss
              </button>
            </motion.div>
          ) : null}

          {/* Pillar Segmented Launcher + Search */}
          <section aria-label="Maintain category selector" className="space-y-2.5">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
              <div
                role="tablist"
                aria-label="Admin Pillars"
                className="flex flex-wrap items-center gap-1 rounded-[18px] border border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#E5E5EA]/75 dark:!bg-[#18181A] p-1 shadow-xs"
              >
                {ADMIN_PILLARS.map((pillar) => {
                  const selected = activePillar === pillar.id;
                  return (
                    <button
                      key={pillar.id}
                      role="tab"
                      type="button"
                      aria-selected={selected}
                      onClick={() => handleSelectPillar(pillar.id)}
                      className={`relative min-h-[44px] rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                        selected
                          ? "text-[#1C1C1E] dark:!text-white"
                          : "text-[#5E5E64] dark:!text-[#A1A1AA] hover:text-[#1C1C1E] dark:hover:!text-white"
                      }`}
                    >
                      {selected && (
                        <motion.span
                          layoutId="admin-pillar-pill"
                          transition={{ type: "spring", stiffness: 360, damping: 28 }}
                          className="absolute inset-0 rounded-full bg-white dark:!bg-[#2C2C2E] dark:border dark:border-[#3A3A3C] shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                        />
                      )}
                      <span className="relative z-10">
                        {mode === "pro" ? pillar.proLabel : pillar.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full lg:w-72">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5E5E64] dark:text-[#A1A1AA]"
                  aria-hidden="true"
                />
                <label htmlFor="admin-search" className="sr-only">
                  Search records in {currentModuleMeta.label}
                </label>
                <input
                  id="admin-search"
                  type="search"
                  placeholder={`Search ${currentModuleMeta.label.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-h-[44px] w-full rounded-full border border-[#D1D1D6] dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] pl-10 pr-4 text-xs text-[#1C1C1E] dark:text-[#F2F2F7] placeholder:text-[#636369] dark:placeholder:text-[#8E8E93] focus:border-[#006838] focus:outline-none focus:ring-2 focus:ring-[#006838]/20"
                />
              </div>
            </div>

            {/* Sub-Module Interactive Pills within Selected Pillar */}
            <div className="flex flex-wrap items-center gap-1.5">
              {pillarModules.map((mod) => {
                const isModActive = activeModule === mod.id;
                const count =
                  mod.mode === "records"
                    ? records.filter((r) => r.module === mod.id).length
                    : mod.mode === "archive"
                      ? inactiveRecordsCount
                      : null;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    aria-pressed={isModActive}
                    onClick={() => setActiveModule(mod.id)}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                      isModActive
                        ? "border-[#006838] bg-[#006838] text-white shadow-[0_4px_12px_rgba(0,104,56,0.22)]"
                        : "border-[#E5E5EA] dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7] hover:bg-[#FAFAFC] dark:hover:bg-[#2C2C2E]"
                    }`}
                  >
                    <span>{mod.label}</span>
                    {count !== null && (
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                          isModActive
                            ? "bg-white/20 text-white"
                            : "bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#5E5E64] dark:text-[#A1A1AA]"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Active Workspace Canvas */}
          <motion.section
            key={activeModule}
            initial={prefersReduced ? false : { y: 8 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            aria-labelledby="active-module-heading"
            className="rounded-[22px] border border-[#E5E5EA] bg-white p-4 shadow-[0_6px_20px_rgba(28,28,30,0.04)] sm:p-5"
          >
            <div className="flex flex-col gap-3 border-b border-[#E5E5EA] pb-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2
                  id="active-module-heading"
                  className="text-lg font-bold tracking-[-0.02em] text-[#1C1C1E]"
                >
                  {currentModuleMeta.label}
                </h2>
                <p className="mt-0.5 text-xs text-[#5E5E64]">
                  {mode === "pro"
                    ? currentModuleMeta.proSummary
                    : currentModuleMeta.simpleSummary}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isGroupableModule && (
                  <div
                    role="group"
                    aria-label="Records View Mode"
                    className="inline-flex items-center rounded-full border border-borderSubtle bg-surfaceAlt p-0.5 text-xs"
                  >
                    <button
                      type="button"
                      aria-pressed={isGroupedView}
                      onClick={() => setIsGroupedView(true)}
                      className={`min-h-[36px] rounded-full px-3 py-1 text-xs font-semibold transition ${
                        isGroupedView
                          ? "bg-surface text-ink shadow-xs"
                          : "text-mutedInk hover:text-ink"
                      }`}
                    >
                      Group by Category
                    </button>
                    <button
                      type="button"
                      aria-pressed={!isGroupedView}
                      onClick={() => setIsGroupedView(false)}
                      className={`min-h-[36px] rounded-full px-3 py-1 text-xs font-semibold transition ${
                        !isGroupedView
                          ? "bg-surface text-ink shadow-xs"
                          : "text-mutedInk hover:text-ink"
                      }`}
                    >
                      Flat List
                    </button>
                  </div>
                )}

                {currentModuleMeta.mode === "records" && (
                  <Link
                    href={`/admin/${currentModuleMeta.id}/new`}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#006838] px-4 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(0,104,56,0.22)] transition hover:bg-[#00582E]"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>New {currentModuleMeta.singularLabel}</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Mode A & B: Top-to-Down Outline List (with IFRS Group -> Individual Outline for Chart of Accounts) */}
            {(currentModuleMeta.mode === "records" ||
              currentModuleMeta.mode === "archive") && (
              <div className="mt-4">
                {activeModule === "accounts" ? (
                  <div className="space-y-3">
                    {/* IFRS Statement Element Filter Strip */}
                    <div
                      className="flex flex-wrap items-center gap-1.5"
                      role="group"
                      aria-label="Filter Chart of Accounts by IFRS Element"
                    >
                      {(["All", ...IFRS_ELEMENTS] as const).map((el) => {
                        const active = ifrsFilter === el;
                        return (
                          <button
                            key={el}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setIfrsFilter(el)}
                            className={`min-h-[36px] rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                              active
                                ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                                : "border-[#E5E5EA] bg-[#FAFAFC] text-[#5E5E64] hover:text-[#1C1C1E]"
                            }`}
                          >
                            {el}
                          </button>
                        );
                      })}
                    </div>

                    {accountsHierarchy.groups.length === 0 && accountsHierarchy.orphans.length === 0 ? (
                      <div className="rounded-[16px] border border-dashed border-[#D1D1D6] bg-[#FAFAFC] p-8 text-center">
                        <p className="text-sm font-semibold text-[#1C1C1E]">
                          No matching IFRS accounts found
                        </p>
                        <p className="mt-1 text-xs text-[#5E5E64]">
                          Clear your search filter or create a Group or Individual GL Account.
                        </p>
                      </div>
                    ) : (
                      <div
                        data-testid="admin-outline-list"
                        className="divide-y divide-[#E5E5EA] overflow-hidden rounded-[16px] border border-[#E5E5EA] bg-white"
                      >
                        {accountsHierarchy.groups.map(({ group, children, totalChildrenCount, rolledUpMetric }) => {
                          const isCollapsed = Boolean(collapsedGroups[group.code]) && !searchQuery.trim();
                          return (
                            <div key={group.id} className="bg-white">
                              {/* Group Account Header Row */}
                              <div className="flex flex-col gap-2 bg-[#FAFAFC] px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-start gap-2 sm:items-center">
                                  <button
                                    type="button"
                                    aria-expanded={!isCollapsed}
                                    aria-label={`Toggle ${group.name} group`}
                                    onClick={() => handleToggleGroupCollapse(group.code)}
                                    className="inline-flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-lg border border-[#E5E5EA] bg-white text-[#1C1C1E] hover:bg-[#F2F2F7]"
                                  >
                                    {isCollapsed ? (
                                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                    )}
                                  </button>

                                  <div className="min-w-0 space-y-0.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="rounded bg-[#1C1C1E] px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                                        {group.code}
                                      </span>
                                      <h3 className="text-sm font-bold text-[#1C1C1E]">
                                        {group.name}
                                      </h3>
                                      <Badge variant="outline" className="bg-white text-[10px] text-[#1C1C1E]">
                                        <FolderTree className="mr-1 h-3 w-3 text-[#006838]" aria-hidden="true" />
                                        Group Account
                                      </Badge>
                                      {group.ifrsStandard && (
                                        <Badge variant="emerald" className="font-mono text-[10px]">
                                          {group.ifrsStandard}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-[#5E5E64]">
                                      {group.ifrsElement ?? group.category} &middot; {totalChildrenCount}{" "}
                                      {totalChildrenCount === 1 ? "individual account" : "individual accounts"} &middot;{" "}
                                      {group.contactOrNote}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center justify-between gap-3 pl-11 sm:justify-end sm:pl-0">
                                  <div className="text-left sm:text-right">
                                    <p className="text-[10px] font-medium uppercase tracking-wide text-[#5E5E64]">
                                      Group Total
                                    </p>
                                    <p className="font-mono text-sm font-bold tabular-nums text-[#1C1C1E]">
                                      {rolledUpMetric}
                                    </p>
                                  </div>
                                  <Link
                                    href={`/admin/${group.module}/${encodeURIComponent(group.id)}`}
                                    aria-label={`Edit ${group.name}`}
                                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-3.5 text-xs font-semibold text-[#1C1C1E] transition hover:bg-[#FAFAFC]"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-[#006838]" aria-hidden="true" />
                                    <span>Edit</span>
                                  </Link>
                                </div>
                              </div>

                              {/* Indented Individual Accounts under Group */}
                              {!isCollapsed && children.length > 0 && (
                                <ul
                                  aria-label={`Individual accounts under ${group.name}`}
                                  className="divide-y divide-[#E5E5EA]/80 border-t border-[#E5E5EA]"
                                >
                                  {children.map((acc) => {
                                    const isJustSaved = recentlySavedId === acc.id;
                                    return (
                                      <li
                                        key={acc.id}
                                        className={`flex flex-col gap-2 py-2.5 pl-8 pr-3.5 transition sm:flex-row sm:items-center sm:justify-between sm:pl-12 ${
                                          isJustSaved
                                            ? "border-l-4 border-l-[#006838] bg-[#E6F5ED]/35"
                                            : acc.isActive
                                              ? "border-l-4 border-l-[#006838]/25 bg-white hover:bg-[#FAFAFC]"
                                              : "border-l-4 border-l-[#D1D1D6] bg-[#F2F2F7]/60 opacity-75"
                                        }`}
                                      >
                                        <div className="min-w-0 space-y-0.5">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="rounded bg-[#F2F2F7] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#1C1C1E]">
                                              {acc.code}
                                            </span>
                                            <h3 className="text-sm font-semibold text-[#1C1C1E]">
                                              {acc.name}
                                            </h3>
                                            <Badge variant={acc.isActive ? "emerald" : "outline"} className="text-[10px]">
                                              {acc.isActive ? "Individual" : "Inactive"}
                                            </Badge>
                                            {acc.ifrsStandard && (
                                              <span className="font-mono text-[10px] font-medium text-[#5E5E64]">
                                                {acc.ifrsStandard}
                                              </span>
                                            )}
                                            {isJustSaved && (
                                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00582E]">
                                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                                Saved
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-[#5E5E64]">
                                            {acc.contactOrNote}
                                          </p>
                                        </div>

                                        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                                          <p className="font-mono text-sm font-bold tabular-nums text-[#1C1C1E]">
                                            {acc.primaryMetricValue}
                                          </p>
                                          <Switch
                                            checked={acc.isActive}
                                            onCheckedChange={() => handleToggleRecordActive(acc.id)}
                                            aria-label={`Toggle active state for ${acc.name}`}
                                          />
                                          <Link
                                            href={`/admin/${acc.module}/${encodeURIComponent(acc.id)}`}
                                            aria-label={`Edit ${acc.name}`}
                                            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-3.5 text-xs font-semibold text-[#1C1C1E] transition hover:bg-[#FAFAFC]"
                                          >
                                            <Pencil className="h-3.5 w-3.5 text-[#006838]" aria-hidden="true" />
                                            <span>Edit</span>
                                          </Link>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>
                          );
                        })}

                        {accountsHierarchy.orphans.length > 0 && (
                          <ul className="divide-y divide-[#E5E5EA]">
                            {accountsHierarchy.orphans.map((rec) => (
                              <li
                                key={rec.id}
                                className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="min-w-0 space-y-0.5">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="rounded bg-[#F2F2F7] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#1C1C1E]">
                                      {rec.code}
                                    </span>
                                    <h3 className="text-sm font-semibold text-[#1C1C1E]">
                                      {rec.name}
                                    </h3>
                                    <Badge variant={rec.isActive ? "emerald" : "outline"} className="text-[10px]">
                                      {rec.isActive ? "Individual" : "Inactive"}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-[#5E5E64]">
                                    {rec.category} &middot; {rec.contactOrNote}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                                  <p className="font-mono text-sm font-bold tabular-nums text-[#1C1C1E]">
                                    {rec.primaryMetricValue}
                                  </p>
                                  <Switch
                                    checked={rec.isActive}
                                    onCheckedChange={() => handleToggleRecordActive(rec.id)}
                                    aria-label={`Toggle active state for ${rec.name}`}
                                  />
                                  <Link
                                    href={`/admin/${rec.module}/${encodeURIComponent(rec.id)}`}
                                    aria-label={`Edit ${rec.name}`}
                                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-3.5 text-xs font-semibold text-[#1C1C1E] transition hover:bg-[#FAFAFC]"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-[#006838]" aria-hidden="true" />
                                    <span>Edit</span>
                                  </Link>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                ) : visibleRecords.length === 0 ? (
                  <div className="rounded-[16px] border border-dashed border-[#D1D1D6] bg-[#FAFAFC] p-8 text-center">
                    <p className="text-sm font-semibold text-[#1C1C1E]">
                      No matching records found
                    </p>
                    <p className="mt-1 text-xs text-[#5E5E64]">
                      Clear your search filter or create a fresh {currentModuleMeta.singularLabel}.
                    </p>
                  </div>
                ) : isGroupableModule && isGroupedView ? (
                  <div data-testid="admin-outline-list" className="space-y-4">
                    {categoryGroups.map((grp) => {
                      const isCollapsed = Boolean(collapsedGroups[grp.category]);
                      return (
                        <div
                          key={grp.category}
                          className="overflow-hidden rounded-[18px] border border-borderSubtle bg-surface shadow-xs"
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            aria-expanded={!isCollapsed}
                            onClick={() => handleToggleGroupCollapse(grp.category)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleToggleGroupCollapse(grp.category);
                              }
                            }}
                            className="flex cursor-pointer flex-wrap items-center justify-between gap-3 bg-surfaceAlt/60 px-4 py-3 transition hover:bg-surfaceAlt"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-[#006838] dark:text-emerald-400">
                                <Folder className="h-3.5 w-3.5" aria-hidden="true" />
                              </span>
                              <div>
                                <h3 className="text-sm font-bold text-ink">
                                  {grp.category}
                                </h3>
                                <span className="text-[11px] text-mutedInk">
                                  {grp.count} {grp.count === 1 ? currentModuleMeta.singularLabel : currentModuleMeta.label}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {grp.subtotalFormatted && (
                                <div className="text-right">
                                  <span className="text-[10px] uppercase font-bold text-mutedInk">Group Total</span>
                                  <p className="font-mono text-xs font-bold text-ink tabular-nums">
                                    {renderWithNairaSign(grp.subtotalFormatted)}
                                  </p>
                                </div>
                              )}
                              <span className="rounded-full p-1 text-mutedInk">
                                {isCollapsed ? (
                                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                )}
                              </span>
                            </div>
                          </div>

                          {!isCollapsed && (
                            <ul className="divide-y divide-borderSubtle">
                              {grp.items.map((rec) => {
                                const isJustSaved = recentlySavedId === rec.id;
                                return (
                                  <li
                                    key={rec.id}
                                    className={`flex flex-col gap-2 px-4 py-2.5 transition sm:flex-row sm:items-center sm:justify-between ${
                                      isJustSaved
                                        ? "bg-[#E6F5ED]/40"
                                        : rec.isActive
                                          ? "bg-surface hover:bg-surfaceAlt/50"
                                          : "bg-surfaceAlt/60 opacity-80"
                                    }`}
                                  >
                                    <div className="min-w-0 space-y-0.5">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded bg-surfaceAlt px-2 py-0.5 font-mono text-[11px] font-bold text-ink">
                                          {rec.code}
                                        </span>
                                        <h4 className="text-sm font-bold text-ink">
                                          {rec.name}
                                        </h4>
                                        <Badge variant={rec.isActive ? "emerald" : "outline"} className="text-[10px]">
                                          {rec.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                        {isJustSaved && (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-forest dark:text-emerald-400">
                                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                            Saved
                                          </span>
                                        )}
                                      </div>
                                      <p className="truncate text-xs text-mutedInk">
                                        {rec.contactOrNote}
                                      </p>
                                    </div>

                                    <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                                      {renderMetricWithSide(
                                        rec.primaryMetricLabel,
                                        rec.primaryMetricValue,
                                        rec.balanceSide,
                                      )}

                                      <Switch
                                        checked={rec.isActive}
                                        onCheckedChange={() => handleToggleRecordActive(rec.id)}
                                        aria-label={`Toggle active state for ${rec.name}`}
                                      />

                                      <Link
                                        href={`/admin/${rec.module}/${encodeURIComponent(rec.id)}`}
                                        aria-label={`Edit ${rec.name}`}
                                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-borderSubtle bg-surface px-3.5 text-xs font-semibold text-ink transition hover:bg-surfaceAlt"
                                      >
                                        <Pencil className="h-3.5 w-3.5 text-[#006838] dark:text-emerald-400" aria-hidden="true" />
                                        <span>Edit</span>
                                      </Link>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <ul
                    data-testid="admin-outline-list"
                    className="divide-y divide-[#E5E5EA] overflow-hidden rounded-[16px] border border-[#E5E5EA] bg-white"
                  >
                    {visibleRecords.map((rec) => {
                      const isJustSaved = recentlySavedId === rec.id;
                      return (
                        <li
                          key={rec.id}
                          className={`flex flex-col gap-2 px-4 py-2.5 transition sm:flex-row sm:items-center sm:justify-between ${
                            isJustSaved
                              ? "bg-[#E6F5ED]/40"
                              : rec.isActive
                                ? "bg-white hover:bg-[#FAFAFC]"
                                : "bg-[#F2F2F7]/65 opacity-80"
                          }`}
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded bg-[#F2F2F7] px-2 py-0.5 font-mono text-[11px] font-bold text-[#1C1C1E]">
                                {rec.code}
                              </span>
                              <h3 className="text-sm font-bold text-[#1C1C1E]">
                                {rec.name}
                              </h3>
                              <Badge variant={rec.isActive ? "emerald" : "outline"} className="text-[10px]">
                                {rec.isActive ? "Active" : "Inactive"}
                              </Badge>
                              {activeModule === "inactive" && (
                                <span className="rounded bg-[#E5E5EA]/70 px-2 py-0.5 font-mono text-[10px] text-[#5E5E64]">
                                  {rec.module}
                                </span>
                              )}
                              {isJustSaved && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00582E]">
                                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  Saved
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-[#5E5E64]">
                              {rec.category} &middot; {rec.contactOrNote}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                            {renderMetricWithSide(
                              rec.primaryMetricLabel,
                              rec.primaryMetricValue,
                              rec.balanceSide,
                            )}

                            <Switch
                              checked={rec.isActive}
                              onCheckedChange={() => handleToggleRecordActive(rec.id)}
                              aria-label={`Toggle active state for ${rec.name}`}
                            />

                            <Link
                              href={`/admin/${rec.module}/${encodeURIComponent(rec.id)}`}
                              aria-label={`Edit ${rec.name}`}
                              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-3.5 text-xs font-semibold text-[#1C1C1E] transition hover:bg-[#FAFAFC]"
                            >
                              <Pencil className="h-3.5 w-3.5 text-[#006838]" aria-hidden="true" />
                              <span>Edit</span>
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {currentModuleMeta.mode === "archive" && (
                  <div className="mt-4 flex items-center gap-2 rounded-[14px] border border-[#E5E5EA] bg-[#FAFAFC] px-4 py-2.5 text-xs text-[#5E5E64]">
                    <Archive className="h-4 w-4 text-[#006838]" aria-hidden="true" />
                    <span>
                      Pausing a record hides it from everyday invoice &amp; voucher dropdowns while preserving 100% of past Nigerian IFRS history.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Mode C1: Company Information Editor */}
            {activeModule === "company" && (
              <form
                onSubmit={(e) => handleSaveCompanySettings(e, "Company Information")}
                className="mt-6 grid gap-5 sm:grid-cols-2"
              >
                <div className="sm:col-span-2 flex items-center gap-2 text-xs font-semibold text-[#00582E]">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  <span>CAC Entity Identity &amp; Statutory Registration</span>
                </div>
                <div>
                  <label htmlFor="comp-legal" className="block text-xs font-semibold text-[#1C1C1E]">
                    Legal Business Name
                  </label>
                  <input
                    id="comp-legal"
                    value={companySettings.legalName}
                    onChange={(e) =>
                      setCompanySettings((s) => ({ ...s, legalName: e.target.value }))
                    }
                    className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3.5 text-sm text-[#1C1C1E]"
                  />
                </div>
                <div>
                  <label htmlFor="comp-rc" className="block text-xs font-semibold text-[#1C1C1E]">
                    CAC RC Number
                  </label>
                  <input
                    id="comp-rc"
                    value={companySettings.rcNumber}
                    onChange={(e) =>
                      setCompanySettings((s) => ({ ...s, rcNumber: e.target.value }))
                    }
                    className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3.5 font-mono text-sm text-[#1C1C1E]"
                  />
                </div>
                <div>
                  <label htmlFor="comp-tin" className="block text-xs font-semibold text-[#1C1C1E]">
                    Federal TIN (NRS)
                  </label>
                  <input
                    id="comp-tin"
                    value={companySettings.tinNumber}
                    onChange={(e) =>
                      setCompanySettings((s) => ({ ...s, tinNumber: e.target.value }))
                    }
                    className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3.5 font-mono text-sm text-[#1C1C1E]"
                  />
                </div>
                <div>
                  <label htmlFor="comp-city" className="block text-xs font-semibold text-[#1C1C1E]">
                    Primary Business Address
                  </label>
                  <input
                    id="comp-city"
                    value={companySettings.cityState}
                    onChange={(e) =>
                      setCompanySettings((s) => ({ ...s, cityState: e.target.value }))
                    }
                    className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3.5 text-sm text-[#1C1C1E]"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end pt-2">
                  <Button type="submit" variant="emerald" className="rounded-full">
                    Save Company Information
                  </Button>
                </div>
              </form>
            )}

            {/* Mode C2: Email Setup Editor */}
            {activeModule === "email" && (
              <form
                onSubmit={(e) => handleSaveCompanySettings(e, "Email Setup")}
                className="mt-6 grid gap-5 sm:grid-cols-2"
              >
                <div className="sm:col-span-2 flex items-center gap-2 text-xs font-semibold text-[#00582E]">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  <span>Invoice Delivery &amp; Payment Reminder Mailer</span>
                </div>
                <div>
                  <label htmlFor="mail-sender" className="block text-xs font-semibold text-[#1C1C1E]">
                    Display Sender Name
                  </label>
                  <input
                    id="mail-sender"
                    value={companySettings.senderName}
                    onChange={(e) =>
                      setCompanySettings((s) => ({ ...s, senderName: e.target.value }))
                    }
                    className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3.5 text-sm text-[#1C1C1E]"
                  />
                </div>
                <div>
                  <label htmlFor="mail-reply" className="block text-xs font-semibold text-[#1C1C1E]">
                    Reply-To Work Email
                  </label>
                  <input
                    id="mail-reply"
                    type="email"
                    value={companySettings.replyToEmail}
                    onChange={(e) =>
                      setCompanySettings((s) => ({ ...s, replyToEmail: e.target.value }))
                    }
                    className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3.5 text-sm text-[#1C1C1E]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="mail-relay" className="block text-xs font-semibold text-[#1C1C1E]">
                    Outbound Delivery Channel
                  </label>
                  <input
                    id="mail-relay"
                    value={companySettings.relayMode}
                    onChange={(e) =>
                      setCompanySettings((s) => ({ ...s, relayMode: e.target.value }))
                    }
                    className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3.5 text-sm text-[#1C1C1E]"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end pt-2">
                  <Button type="submit" variant="emerald" className="rounded-full">
                    Save Email Setup
                  </Button>
                </div>
              </form>
            )}

            {/* Mode C3: Default Information Editor */}
            {activeModule === "defaults" && (
              <form
                onSubmit={(e) => handleSaveCompanySettings(e, "Default Information")}
                className="mt-6 grid gap-5 sm:grid-cols-2"
              >
                <div className="sm:col-span-2 flex items-center gap-2 text-xs font-semibold text-[#00582E]">
                  <Settings2 className="h-4 w-4" aria-hidden="true" />
                  <span>Workspace Currency, Invoice Terms &amp; VAT Handling</span>
                </div>
                <div>
                  <label htmlFor="def-terms" className="block text-xs font-semibold text-[#1C1C1E]">
                    Default Customer Payment Terms
                  </label>
                  <input
                    id="def-terms"
                    value={companySettings.defaultTerms}
                    onChange={(e) =>
                      setCompanySettings((s) => ({ ...s, defaultTerms: e.target.value }))
                    }
                    className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3.5 text-sm text-[#1C1C1E]"
                  />
                </div>
                <div>
                  <label htmlFor="def-vat" className="block text-xs font-semibold text-[#1C1C1E]">
                    Default Tax &amp; VAT Handling
                  </label>
                  <input
                    id="def-vat"
                    value={companySettings.defaultVatRule}
                    onChange={(e) =>
                      setCompanySettings((s) => ({ ...s, defaultVatRule: e.target.value }))
                    }
                    className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3.5 text-sm text-[#1C1C1E]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="def-currency" className="block text-xs font-semibold text-[#1C1C1E]">
                    Functional Reporting Currency
                  </label>
                  <input
                    id="def-currency"
                    value={companySettings.baseCurrency}
                    onChange={(e) =>
                      setCompanySettings((s) => ({ ...s, baseCurrency: e.target.value }))
                    }
                    className="mt-1.5 min-h-[44px] w-full rounded-[14px] border border-[#D1D1D6] bg-[#FAFAFC] px-3.5 font-mono text-sm text-[#1C1C1E]"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end pt-2">
                  <Button type="submit" variant="emerald" className="rounded-full">
                    Save Default Information
                  </Button>
                </div>
              </form>
            )}
          </motion.section>
        </main>
      </div>
    </MotionConfig>
  );
}
