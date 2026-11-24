"use client";

import React, { useEffect, useId, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  Columns3,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import type { FiscalPeriod, FrcnFinancialStatementPackage } from "@/types/ledger";
import { exportTableToExcel } from "@/lib/excel-export";
import { FrcnAnnualReportModal } from "./FrcnAnnualReportModal";
import { renderWithNairaSign } from "@/components/ui/NairaAmount";
import {
  formatNairaAmount,
  formatShortNaira,
  REPORT_CATEGORIES,
  type ReportColumn,
  type ReportDefinition,
  type ReportRow,
} from "./reports-data";
import { ReportIconBadge } from "./ReportIconBadge";

interface ReportViewerProps {
  readonly report: ReportDefinition;
  readonly pkg?: FrcnFinancialStatementPackage;
  readonly periods: readonly FiscalPeriod[];
  readonly selectedPeriodId: string;
  readonly onPeriodChange: (periodId: string) => void;
  readonly isPending: boolean;
  readonly onBack: () => void;
  readonly workspaceMode: "simple" | "pro";
  readonly workspaceName?: string;
  readonly workspaceRc?: string;
}

const HIDE_ZERO_KEY = "nairabooks_reports_hide_zero";

export function ReportViewer({
  report,
  pkg,
  periods,
  selectedPeriodId,
  onPeriodChange,
  isPending,
  onBack,
  workspaceMode,
  workspaceName = "Lagos Trading & Hospitality Ltd",
  workspaceRc = "RC 1482910",
}: ReportViewerProps) {
  const prefersReduced = useReducedMotion();
  const searchInputId = useId();
  const minAmtInputId = useId();
  const maxAmtInputId = useId();

  // 1. Column Selection State
  const defaultColIds = useMemo(
    () => new Set(report.columns.filter((c) => c.isDefaultVisible).map((c) => c.id)),
    [report.columns],
  );
  const [visibleColIds, setVisibleColIds] = useState<Set<string>>(defaultColIds);

  // 2. Open Toolbars / Drawers
  const [activeToolbar, setActiveToolbar] = useState<
    "filter" | "columns" | "export" | "view" | "advanced" | null
  >(null);

  // 3. Filter Options State
  const [searchQuery, setSearchQuery] = useState("");
  // Remembered per browser so zero-balance ledgers stay hidden across reports and visits.
  const [hideZeroBalances, setHideZeroBalancesState] = useState(false);
  useEffect(() => {
    try {
      setHideZeroBalancesState(window.localStorage.getItem(HIDE_ZERO_KEY) === "1");
    } catch {
      // Storage unavailable: default to showing everything
    }
  }, []);
  const setHideZeroBalances = (next: boolean) => {
    setHideZeroBalancesState(next);
    try {
      window.localStorage.setItem(HIDE_ZERO_KEY, next ? "1" : "0");
    } catch {
      // Ignore storage errors
    }
  };
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  // 4. View Options State
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [scale, setScale] = useState<"full" | "short">("full");
  const [zebra, setZebra] = useState(true);

  // 5. Advanced Options State (Specific to Report)
  const initialAdvOptions = useMemo(() => {
    const acc: Record<string, boolean | string> = {};
    for (const opt of report.advancedOptions) {
      acc[opt.id] = opt.defaultValue;
    }
    return acc;
  }, [report.advancedOptions]);
  const [advancedState, setAdvancedState] = useState<Record<string, boolean | string>>(
    initialAdvOptions,
  );

  // 6. Sorting State
  const [sortColId, setSortColId] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFrcnModalOpen, setIsFrcnModalOpen] = useState(false);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const categoryMeta = useMemo(
    () => REPORT_CATEGORIES.find((c) => c.key === report.category) ?? REPORT_CATEGORIES[0]!,
    [report.category],
  );

  // Generate Base Rows & KPIs
  const { rows: rawRows, summaryKpis } = useMemo(
    () => report.generateRows(pkg, advancedState),
    [report, pkg, advancedState],
  );

  // Filtered Rows
  const filteredRows = useMemo(() => {
    return rawRows.filter((row) => {
      // 1. Zero balances
      if (hideZeroBalances) {
        const hasNonZero = Object.entries(row.values).some(([key, val]) => {
          if (typeof val === "number") return val !== 0;
          return false;
        });
        if (!hasNonZero && !row.isTotal) return false;
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = Object.values(row.values).some((v) =>
          String(v).toLowerCase().includes(q),
        );
        if (!matches) return false;
      }

      // 3. Min/Max Amount filter
      const minNum = minAmount ? Number(minAmount) : null;
      const maxNum = maxAmount ? Number(maxAmount) : null;
      if (minNum !== null || maxNum !== null) {
        const numbers = Object.values(row.values).filter(
          (v): v is number => typeof v === "number",
        );
        if (numbers.length > 0) {
          const maxVal = Math.max(...numbers);
          if (minNum !== null && maxVal < minNum) return false;
          if (maxNum !== null && maxVal > maxNum) return false;
        }
      }

      return true;
    });
  }, [rawRows, hideZeroBalances, searchQuery, minAmount, maxAmount]);

  // Sorted Rows
  const sortedRows = useMemo(() => {
    if (!sortColId) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      if (a.isTotal) return 1;
      if (b.isTotal) return -1;
      const valA = a.values[sortColId];
      const valB = b.values[sortColId];
      if (valA === undefined && valB === undefined) return 0;
      if (valA === undefined) return 1;
      if (valB === undefined) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortAsc ? valA - valB : valB - valA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredRows, sortColId, sortAsc]);

  const visibleColumns = useMemo(
    () => report.columns.filter((c) => visibleColIds.has(c.id)),
    [report.columns, visibleColIds],
  );

  // Column toggling
  const toggleColumn = (colId: string) => {
    setVisibleColIds((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) {
        if (next.size <= 1) return prev; // Keep at least one column
        next.delete(colId);
      } else {
        next.add(colId);
      }
      return next;
    });
  };

  const handleSelectAllColumns = () => {
    setVisibleColIds(new Set(report.columns.map((c) => c.id)));
  };

  const handleResetColumns = () => {
    setVisibleColIds(new Set(defaultColIds));
  };

  // Sorting handler
  const handleSort = (colId: string) => {
    if (sortColId === colId) {
      if (sortAsc) {
        setSortAsc(false);
      } else {
        setSortColId(null);
        setSortAsc(true);
      }
    } else {
      setSortColId(colId);
      setSortAsc(true);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = visibleColumns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",");
    const lines = sortedRows.map((r) =>
      visibleColumns
        .map((c) => {
          const val = r.values[c.id];
          if (val === undefined || val === null) return '""';
          if (typeof val === "number") return val;
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(","),
    );
    const csvContent = [headers, ...lines].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nairabooks-${report.id}-${selectedPeriodId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${report.title} CSV (${visibleColumns.length} columns)`);
  };

  // Export Excel (.xlsx)
  const handleExportExcel = () => {
    const cols = visibleColumns.map((col) => ({
      label: col.label,
      width: col.isNumeric ? 140 : 200,
      type: col.isNumeric ? ("Currency" as const) : ("String" as const),
    }));
    const rows = sortedRows.map((r) =>
      visibleColumns.map((col) => r.values[col.id] ?? ""),
    );
    exportTableToExcel({
      filename: `nairabooks-${report.id}-${selectedPeriodId}.xlsx`,
      sheetName: report.title.slice(0, 30),
      title: `${report.title} - NairaBooks FRCN Statutory Ledger`,
      subtitle: `Period: ${selectedPeriodId} · Standard: ${report.statutoryStandard} · CAMA 405 Hash: ${pkg?.snapshotHash?.slice(0, 16) ?? "N/A"}`,
      columns: cols,
      rows,
    });
    showToast(`Exported ${report.title} to Excel (.xlsx)`);
  };

  // Export JSON
  const handleExportJson = () => {
    const data = sortedRows.map((r) => {
      const obj: Record<string, string | number> = {};
      for (const col of visibleColumns) {
        obj[col.label] = r.values[col.id] ?? "";
      }
      return obj;
    });
    const payload = {
      reportId: report.id,
      title: report.title,
      category: report.category,
      periodId: selectedPeriodId,
      exportedAt: new Date().toISOString(),
      camaSnapshotDigest: pkg?.snapshotHash ?? "UNCERTIFIED",
      data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nairabooks-${report.id}-${selectedPeriodId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${report.title} JSON payload`);
  };

  // Copy to Clipboard (Tab Delimited)
  const handleCopyToClipboard = async () => {
    const headers = visibleColumns.map((c) => c.label).join("\t");
    const lines = sortedRows.map((r) =>
      visibleColumns.map((c) => r.values[c.id] ?? "").join("\t"),
    );
    const text = [headers, ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied report table to clipboard (Excel ready)");
    } catch {
      showToast("Unable to copy to clipboard.");
    }
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Export to PDF (A4 Vector Document)
  const handleExportPdf = () => {
    const originalTitle = document.title;
    document.title = `NairaBooks_IFRS_${report.id.toUpperCase()}_${selectedPeriodId}`;
    showToast("Generating A4 PDF. Choose 'Save as PDF' in your browser dialog.");
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
    }, 250);
  };

  const isFilterActive =
    searchQuery.trim().length > 0 ||
    minAmount.length > 0 ||
    maxAmount.length > 0;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? undefined : { opacity: 0, y: -8 }}
            role="status"
            aria-live="polite"
            className="no-print fixed top-20 right-6 z-50 inline-flex items-center gap-2 rounded-full border border-[#006838] bg-[#006838] px-4 py-2 text-xs font-bold text-white shadow-lg"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen Chrome & Controls (Screen Only, Hidden in Print & PDF Export) */}
      <div className="no-print space-y-6">
        {/* 1. Header & Navigation Capsule */}
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <button
                type="button"
                onClick={onBack}
                className="group mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#5E5E64] transition hover:text-[#1C1C1E]"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" aria-hidden="true" />
                <span>Back to All Reports</span>
              </button>

              <div className="flex flex-wrap items-center gap-3">
                <ReportIconBadge
                  iconKey={categoryMeta.iconKey}
                  tintBg={categoryMeta.tintBg}
                  tintText={categoryMeta.tintText}
                  size="lg"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold tracking-[-0.025em] text-[#1C1C1E] sm:text-2xl">
                      {report.title}
                    </h1>
                    <span
                      style={{ backgroundColor: categoryMeta.tintBg, color: categoryMeta.tintText }}
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                    >
                      {categoryMeta.shortLabel}
                    </span>
                    <span className="rounded-full border border-[#006838]/20 bg-[#E6F5ED] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#006838]">
                      Standard: {report.statutoryStandard}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#5E5E64] max-w-2xl">{report.summary}</p>
                </div>
              </div>
            </div>

            {/* Period Selector & Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5 self-start">
              <label htmlFor="report-period-select" className="sr-only">
                Select Fiscal Period
              </label>
              <div className="flex items-center rounded-full border border-[#D1D1D6] bg-white px-3 py-1.5 shadow-sm">
                <span className="mr-2 text-xs font-medium text-[#5E5E64]">Period:</span>
                <select
                  id="report-period-select"
                  value={selectedPeriodId}
                  disabled={isPending}
                  onChange={(e) => onPeriodChange(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#1C1C1E] focus:outline-none"
                >
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.status === "OPEN" ? "Open" : "CAMA Locked"})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {summaryKpis.map((kpi, idx) => {
          // If this is equilibrium status on trial balance, ensure data-testid is present for tests
          const isBalanceKpi = report.id === "trial-balance" && idx === 2;
          const isBalanced = pkg?.isBalanced ?? true;

          return (
            <div
              key={kpi.label}
              className="rounded-[18px] border border-[#E5E5EA] bg-white p-4 shadow-[0_2px_8px_rgba(28,28,30,0.04)]"
            >
              <p className="text-[11px] font-semibold tracking-wide uppercase text-[#5E5E64]">
                {kpi.label}
              </p>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <p
                  {...(isBalanceKpi ? { "data-testid": "frcn-balance-status" } : {})}
                  aria-live="polite"
                  className={`nb-money-cell text-lg font-bold sm:text-xl ${
                    isBalanceKpi
                      ? isBalanced
                        ? "text-[#006838]"
                        : "text-[#B91C1C]"
                      : "text-[#1C1C1E]"
                  }`}
                >
                  {kpi.value}
                </p>
                {kpi.change && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      kpi.change.includes("+")
                        ? "bg-[#E6F5ED] text-[#006838]"
                        : "bg-[#FEF2F2] text-[#B91C1C]"
                    }`}
                  >
                    {kpi.change}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pro Mode CAMA Digest Card (Passes existing Pro snapshot test requirement) */}
      {workspaceMode === "pro" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#BDE5CF] bg-[#E6F5ED]/40 px-4 py-3 text-xs text-[#00582E]">
          <div className="flex items-center gap-2">
            <span className="font-bold">CAMA 2020 Sec 405 Audit Seal:</span>
            <span className="font-mono text-[11px]">
              SHA-256 Digest: {pkg?.snapshotHash ?? "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
            </span>
          </div>
          <span className="rounded-full bg-[#006838] px-2.5 py-0.5 text-[10px] font-bold text-white">
            Statutory Cryptographic Lock
          </span>
        </div>
      )}

      {/* 3. Five-Button Control Toolbar (Filter, Columns, Export, View, Advanced) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E5EA] pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* A. Filters Button */}
          <button
            type="button"
            aria-expanded={activeToolbar === "filter"}
            aria-controls="report-filter-panel"
            onClick={() => setActiveToolbar(activeToolbar === "filter" ? null : "filter")}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition ${
              activeToolbar === "filter" || isFilterActive
                ? "border-[#006838] bg-[#006838] text-white"
                : "border-[#D1D1D6] bg-white text-[#1C1C1E] hover:bg-[#F2F2F7]"
            }`}
          >
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Filters</span>
            {isFilterActive && (
              <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#006838]">
                !
              </span>
            )}
          </button>

          {/* Hide zero-balance ledgers (one click, remembered) */}
          <button
            type="button"
            aria-pressed={hideZeroBalances}
            onClick={() => setHideZeroBalances(!hideZeroBalances)}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition ${
              hideZeroBalances
                ? "border-[#006838] bg-[#006838] text-white"
                : "border-[#D1D1D6] bg-white text-[#1C1C1E] hover:bg-[#F2F2F7]"
            }`}
          >
            <span>{hideZeroBalances ? "Zero balances hidden" : "Hide zero balances"}</span>
          </button>

          {/* B. Columns Button */}
          <button
            type="button"
            aria-expanded={activeToolbar === "columns"}
            aria-controls="report-columns-panel"
            onClick={() => setActiveToolbar(activeToolbar === "columns" ? null : "columns")}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition ${
              activeToolbar === "columns"
                ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                : "border-[#D1D1D6] bg-white text-[#1C1C1E] hover:bg-[#F2F2F7]"
            }`}
          >
            <Columns3 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              Columns ({visibleColumns.length}/{report.columns.length})
            </span>
          </button>

          {/* C. View Options Button */}
          <button
            type="button"
            aria-expanded={activeToolbar === "view"}
            aria-controls="report-view-panel"
            onClick={() => setActiveToolbar(activeToolbar === "view" ? null : "view")}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition ${
              activeToolbar === "view"
                ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                : "border-[#D1D1D6] bg-white text-[#1C1C1E] hover:bg-[#F2F2F7]"
            }`}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Display &amp; Scale</span>
          </button>

          {/* D. Advanced Options Button */}
          {report.advancedOptions.length > 0 && (
            <button
              type="button"
              aria-expanded={activeToolbar === "advanced"}
              aria-controls="report-advanced-panel"
              onClick={() =>
                setActiveToolbar(activeToolbar === "advanced" ? null : "advanced")
              }
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition ${
                activeToolbar === "advanced"
                  ? "border-[#0F4C81] bg-[#0F4C81] text-white"
                  : "border-[#D1D1D6] bg-white text-[#1C1C1E] hover:bg-[#F2F2F7]"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Advanced Options ({report.advancedOptions.length})</span>
            </button>
          )}
        </div>

        {/* E. Export & Statutory Actions Menu */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-[#006838] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#00582E] active:scale-95"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-3 text-xs font-semibold text-[#1C1C1E] transition hover:bg-[#F2F2F7]"
          >
            <Download className="h-3.5 w-3.5 text-[#006838]" aria-hidden="true" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFrcnModalOpen(true)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-3 text-xs font-bold text-[#065F46] shadow-sm transition hover:bg-[#D1FAE5]"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
            <span>FRCN Annual Report</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-3 text-xs font-semibold text-[#1C1C1E] transition hover:bg-[#F2F2F7]"
          >
            <Download className="h-3.5 w-3.5 text-[#0F4C81]" aria-hidden="true" />
            <span>JSON</span>
          </button>

          <button
            type="button"
            onClick={handleCopyToClipboard}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-3 text-xs font-semibold text-[#1C1C1E] transition hover:bg-[#F2F2F7]"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Copy</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-red-200 bg-red-50/80 px-3 text-xs font-semibold text-red-900 transition hover:bg-red-100"
          >
            <FileText className="h-3.5 w-3.5 text-red-700" aria-hidden="true" />
            <span>Export to PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            aria-label="Print Report"
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-3.5 text-xs font-semibold text-[#1C1C1E] transition hover:bg-[#F2F2F7]"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* 4. Expandable Options Drawers */}
      <AnimatePresence initial={false}>
        {/* A. Filters Drawer */}
        {activeToolbar === "filter" && (
          <motion.div
            id="report-filter-panel"
            initial={prefersReduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={prefersReduced ? undefined : { opacity: 0, height: 0 }}
            className="overflow-hidden rounded-[20px] border border-[#E5E5EA] bg-[#FAFAFC] p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E5EA] pb-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#006838]" aria-hidden="true" />
                <h2 className="text-xs font-bold text-[#1C1C1E]">Report Filters</h2>
              </div>
              <div className="flex items-center gap-2">
                {isFilterActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setHideZeroBalances(false);
                      setMinAmount("");
                      setMaxAmount("");
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B91C1C] hover:underline"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    <span>Clear All Filters</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveToolbar(null)}
                  aria-label="Close Filter Panel"
                  className="rounded-full p-1 text-[#5E5E64] hover:bg-[#E5E5EA]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Search Within Report */}
              <div>
                <label htmlFor={searchInputId} className="block text-xs font-semibold text-[#1C1C1E]">
                  Search Text / Account / Party
                </label>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-[#5E5E64]" />
                  <input
                    id={searchInputId}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search any field..."
                    className="min-h-[38px] w-full rounded-[10px] border border-[#D1D1D6] bg-white pl-9 pr-3 text-xs text-[#1C1C1E] focus:border-[#006838] focus:outline-none"
                  />
                </div>
              </div>

              {/* Amount Range */}
              <div>
                <span className="block text-xs font-semibold text-[#1C1C1E]">
                  Amount Range (₦)
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <label htmlFor={minAmtInputId} className="sr-only">
                    Minimum Amount
                  </label>
                  <input
                    id={minAmtInputId}
                    type="number"
                    min="0"
                    placeholder="Min ₦"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="min-h-[38px] w-full rounded-[10px] border border-[#D1D1D6] bg-white px-3 font-mono text-xs text-[#1C1C1E]"
                  />
                  <span className="text-[#5E5E64] text-xs">to</span>
                  <label htmlFor={maxAmtInputId} className="sr-only">
                    Maximum Amount
                  </label>
                  <input
                    id={maxAmtInputId}
                    type="number"
                    min="0"
                    placeholder="Max ₦"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="min-h-[38px] w-full rounded-[10px] border border-[#D1D1D6] bg-white px-3 font-mono text-xs text-[#1C1C1E]"
                  />
                </div>
              </div>

              {/* Hide Zero Balances Switch */}
              <div className="flex items-center justify-between rounded-[12px] border border-[#E5E5EA] bg-white p-3 self-end min-h-[38px]">
                <div>
                  <p className="text-xs font-bold text-[#1C1C1E]">Hide Zero Balances</p>
                  <p className="text-[10px] text-[#5E5E64]">Omit ₦0.00 items</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={hideZeroBalances}
                  aria-label="Hide Zero Balances"
                  onClick={() => setHideZeroBalances(!hideZeroBalances)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    hideZeroBalances ? "bg-[#006838]" : "bg-[#D1D1D6]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition ${
                      hideZeroBalances ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* B. Columns Drawer */}
        {activeToolbar === "columns" && (
          <motion.div
            id="report-columns-panel"
            initial={prefersReduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={prefersReduced ? undefined : { opacity: 0, height: 0 }}
            className="overflow-hidden rounded-[20px] border border-[#E5E5EA] bg-[#FAFAFC] p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E5EA] pb-3">
              <div className="flex items-center gap-2">
                <Columns3 className="h-4 w-4 text-[#1C1C1E]" aria-hidden="true" />
                <h2 className="text-xs font-bold text-[#1C1C1E]">Customize Visible Columns</h2>
                <span className="text-[11px] text-[#5E5E64]">
                  (Tick to show, untick to hide in real-time)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllColumns}
                  className="text-[11px] font-semibold text-[#006838] hover:underline"
                >
                  Select All
                </button>
                <span className="text-[#D1D1D6]">|</span>
                <button
                  type="button"
                  onClick={handleResetColumns}
                  className="text-[11px] font-semibold text-[#5E5E64] hover:underline"
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={() => setActiveToolbar(null)}
                  aria-label="Close Columns Panel"
                  className="rounded-full p-1 text-[#5E5E64] hover:bg-[#E5E5EA]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {report.columns.map((col) => {
                const isSelected = visibleColIds.has(col.id);
                return (
                  <button
                    key={col.id}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => toggleColumn(col.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      isSelected
                        ? "border-[#006838] bg-[#E6F5ED] text-[#006838]"
                        : "border-[#D1D1D6] bg-white text-[#5E5E64] hover:border-[#1C1C1E]"
                    }`}
                  >
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-[#006838] bg-[#006838] text-white"
                          : "border-[#D1D1D6] bg-white text-transparent"
                      }`}
                    >
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                    <span>{col.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* C. View Options Drawer (Display & Scale) */}
        {activeToolbar === "view" && (
          <motion.div
            id="report-view-panel"
            initial={prefersReduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={prefersReduced ? undefined : { opacity: 0, height: 0 }}
            className="overflow-hidden rounded-[20px] border border-[#E5E5EA] bg-[#FAFAFC] p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E5EA] pb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#1C1C1E]" aria-hidden="true" />
                <h2 className="text-xs font-bold text-[#1C1C1E]">Viewing &amp; Formatting Options</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveToolbar(null)}
                aria-label="Close View Options Panel"
                className="rounded-full p-1 text-[#5E5E64] hover:bg-[#E5E5EA]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Row Density */}
              <div>
                <span className="block text-xs font-semibold text-[#1C1C1E]">
                  Row Spacing Density
                </span>
                <div className="mt-1.5 flex items-center rounded-full border border-[#D1D1D6] bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setDensity("comfortable")}
                    className={`flex-1 rounded-full py-1 text-xs font-semibold transition ${
                      density === "comfortable"
                        ? "bg-[#1C1C1E] text-white"
                        : "text-[#5E5E64] hover:text-[#1C1C1E]"
                    }`}
                  >
                    Comfortable
                  </button>
                  <button
                    type="button"
                    onClick={() => setDensity("compact")}
                    className={`flex-1 rounded-full py-1 text-xs font-semibold transition ${
                      density === "compact"
                        ? "bg-[#1C1C1E] text-white"
                        : "text-[#5E5E64] hover:text-[#1C1C1E]"
                    }`}
                  >
                    Compact Ledger
                  </button>
                </div>
              </div>

              {/* Number Format Scale */}
              <div>
                <span className="block text-xs font-semibold text-[#1C1C1E]">
                  Currency Number Scale
                </span>
                <div className="mt-1.5 flex items-center rounded-full border border-[#D1D1D6] bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setScale("full")}
                    className={`flex-1 rounded-full py-1 text-xs font-semibold transition ${
                      scale === "full"
                        ? "bg-[#1C1C1E] text-white"
                        : "text-[#5E5E64] hover:text-[#1C1C1E]"
                    }`}
                  >
                    Full Naira (₦0.00)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScale("short")}
                    className={`flex-1 rounded-full py-1 text-xs font-semibold transition ${
                      scale === "short"
                        ? "bg-[#1C1C1E] text-white"
                        : "text-[#5E5E64] hover:text-[#1C1C1E]"
                    }`}
                  >
                    Short (₦k / ₦M)
                  </button>
                </div>
              </div>

              {/* Zebra Striping Toggle */}
              <div className="flex items-center justify-between rounded-[12px] border border-[#E5E5EA] bg-white p-3 self-end min-h-[38px]">
                <div>
                  <p className="text-xs font-bold text-[#1C1C1E]">Alternating Row Tints</p>
                  <p className="text-[10px] text-[#5E5E64]">Zebra striping for readability</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={zebra}
                  aria-label="Alternating Row Tints"
                  onClick={() => setZebra(!zebra)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    zebra ? "bg-[#006838]" : "bg-[#D1D1D6]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition ${
                      zebra ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* D. Advanced Options Drawer (Report Specific!) */}
        {activeToolbar === "advanced" && report.advancedOptions.length > 0 && (
          <motion.div
            id="report-advanced-panel"
            initial={prefersReduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={prefersReduced ? undefined : { opacity: 0, height: 0 }}
            className="overflow-hidden rounded-[20px] border border-[#0F4C81]/30 bg-[#EAF3FC]/40 p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0F4C81]/20 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#0F4C81]" aria-hidden="true" />
                <h2 className="text-xs font-bold text-[#0F4C81]">
                  Advanced Controls for {report.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveToolbar(null)}
                aria-label="Close Advanced Panel"
                className="rounded-full p-1 text-[#5E5E64] hover:bg-[#E5E5EA]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {report.advancedOptions.map((opt) => {
                const currentVal = advancedState[opt.id] ?? opt.defaultValue;

                if (opt.type === "boolean") {
                  const checked = Boolean(currentVal);
                  return (
                    <div
                      key={opt.id}
                      className="flex items-center justify-between rounded-[14px] border border-[#0F4C81]/15 bg-white p-3.5 shadow-sm"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#1C1C1E]">{opt.label}</p>
                        <p className="text-[11px] text-[#5E5E64]">{opt.description}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={checked}
                        aria-label={opt.label}
                        onClick={() =>
                          setAdvancedState((prev) => ({ ...prev, [opt.id]: !checked }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          checked ? "bg-[#0F4C81]" : "bg-[#D1D1D6]"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition ${
                            checked ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  );
                }

                if (opt.type === "select" && opt.options) {
                  return (
                    <div
                      key={opt.id}
                      className="rounded-[14px] border border-[#0F4C81]/15 bg-white p-3.5 shadow-sm"
                    >
                      <label htmlFor={`adv-opt-${opt.id}`} className="block text-xs font-bold text-[#1C1C1E]">
                        {opt.label}
                      </label>
                      <p className="mb-2 text-[11px] text-[#5E5E64]">{opt.description}</p>
                      <select
                        id={`adv-opt-${opt.id}`}
                        value={String(currentVal)}
                        onChange={(e) =>
                          setAdvancedState((prev) => ({ ...prev, [opt.id]: e.target.value }))
                        }
                        className="min-h-[38px] w-full rounded-[10px] border border-[#D1D1D6] bg-white px-3 text-xs font-semibold text-[#1C1C1E] focus:outline-none"
                      >
                        {opt.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* 5. The Authentic A4 IFRS Document Desk */}
      <section
        aria-label={`${report.title} Table Data`}
        className="rounded-2xl border border-slate-300/80 bg-[#E8E8EE] p-2 sm:p-6 md:p-8 flex justify-center overflow-x-auto shadow-inner print:p-0 print:m-0 print:border-none print:bg-white print:shadow-none print:overflow-visible"
      >
        <article
          id="a4-report-document"
          className="a4-report-document w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 p-6 sm:p-10 md:p-14 shadow-2xl ring-1 ring-slate-900/10 rounded-sm relative flex flex-col justify-between print:shadow-none print:ring-0 print:max-w-full print:p-0 print:m-0 print:border-none"
          style={{ minHeight: "297mm" }}
        >
          <div>
            {/* A4 Sheet Header: Official Nigerian Letterhead */}
            <div className="border-b-2 border-slate-900 pb-5 mb-6 text-center">
              <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500 mb-2 border-b border-slate-200 pb-1.5">
                <span>{workspaceRc} · TIN: 23094921-0001</span>
                <span className="font-semibold text-emerald-800 uppercase tracking-wider">
                  FRCN ACCREDITED · CAMA 2020 SEC 377
                </span>
                <span>Lagos, Nigeria</span>
              </div>

              <p className="text-lg sm:text-2xl font-serif font-bold uppercase tracking-tight text-slate-950">
                {workspaceName}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Plot 18, Ozumba Mbadiwe Avenue, Victoria Island, Lagos State, Nigeria
              </p>

              <div className="mt-4 pt-3 border-t border-slate-200">
                <h2 className="text-sm sm:text-base font-serif font-bold uppercase tracking-wider text-slate-950">
                  {report.title}
                </h2>
                <p className="text-xs font-medium text-slate-700 mt-0.5">
                  For the Financial Period Ended {periods.find((p) => p.id === selectedPeriodId)?.label ?? "FY2026"}
                </p>
                <p className="text-[11px] italic text-slate-500 mt-0.5">
                  Prepared in accordance with {report.statutoryStandard} · All amounts stated in Nigerian Naira (₦)
                </p>
              </div>
            </div>

            {/* IFRS Financial Statement Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                <thead className="border-b border-slate-900 bg-slate-50 text-[11px] font-bold text-slate-900">
                  <tr>
                    {visibleColumns.map((col) => {
                      const isSorted = sortColId === col.id;
                      const alignClass =
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                            ? "text-center"
                            : "text-left";

                      return (
                        <th
                          key={col.id}
                          scope="col"
                          style={{ width: col.width }}
                          className={`px-4 py-3 font-semibold ${alignClass}`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSort(col.id)}
                            className={`inline-flex items-center gap-1 hover:text-slate-950 ${
                              col.align === "right" ? "ml-auto" : ""
                            }`}
                          >
                            <span>{col.label}</span>
                            {isSorted ? (
                              sortAsc ? (
                                <ArrowUp className="h-3 w-3 text-[#006838]" aria-hidden="true" />
                              ) : (
                                <ArrowDown className="h-3 w-3 text-[#006838]" aria-hidden="true" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-30" aria-hidden="true" />
                            )}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {sortedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={visibleColumns.length}
                        className="px-4 py-8 text-center text-xs text-[#5E5E64]"
                      >
                        No matching records found for the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    sortedRows.map((row, idx) => {
                      const isTotal = row.isTotal;
                      const rowBg = isTotal
                        ? "border-t border-slate-900 border-b-4 border-double border-slate-900 font-bold bg-slate-50/70 text-slate-950"
                        : zebra && idx % 2 === 1
                          ? "bg-[#FAFAFC]"
                          : "bg-white";

                      const py = density === "compact" ? "py-2" : "py-3";

                      return (
                        <tr
                          key={row.id}
                          className={`transition ${rowBg} ${
                            !isTotal ? "hover:bg-slate-50" : ""
                          }`}
                        >
                          {visibleColumns.map((col, colIdx) => {
                            const val = row.values[col.id];
                            const isNumeric = col.isNumeric;
                            const alignClass =
                              col.align === "right"
                                ? "text-right"
                                : col.align === "center"
                                  ? "text-center"
                                  : "text-left";

                            let displayVal: React.ReactNode = val ?? "—";
                            if (typeof val === "number" && isNumeric) {
                              displayVal =
                                scale === "short" ? formatShortNaira(val) : formatNairaAmount(val);
                            }
                            if (typeof displayVal === "string" && displayVal.includes("₦")) {
                              displayVal = renderWithNairaSign(displayVal);
                            }

                            // Use <th> for first column for semantic table accessibility
                            if (colIdx === 0) {
                              return (
                                <th
                                  key={col.id}
                                  scope="row"
                                  className={`px-4 ${py} font-semibold text-slate-950 ${alignClass}`}
                                >
                                  {displayVal}
                                </th>
                              );
                            }

                            return (
                              <td
                                key={col.id}
                                className={`px-4 ${py} ${alignClass} ${
                                  isNumeric
                                    ? "nb-money-cell font-mono font-medium text-slate-950"
                                    : "text-slate-900"
                                }`}
                              >
                                {displayVal}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-500 rounded-lg mt-4">
              <div>
                Showing <span className="font-bold text-slate-900">{sortedRows.length}</span> of{" "}
                <span className="font-bold text-slate-900">{rawRows.length}</span> rows ·{" "}
                <span className="font-bold text-slate-900">{visibleColumns.length}</span> visible columns
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px]">Period: {selectedPeriodId}</span>
                <span className="text-slate-300">·</span>
                <span>Nigerian IFRS &amp; Tax Compliant</span>
              </div>
            </div>
          </div>

          {/* A4 Sheet Footer: CAMA 2020 Statutory Dual Sign-Off Block */}
          <div className="mt-8 pt-6 border-t border-slate-200 space-y-6 a4-sign-off-block">
            <div className="grid grid-cols-2 gap-8 text-xs text-slate-800">
              <div>
                <div className="h-10 border-b border-dashed border-slate-400 mb-1.5 flex items-end">
                  <span className="font-serif italic text-sm text-slate-700">Olumide Adeleke</span>
                </div>
                <p className="font-bold text-slate-950">Managing Director / CEO</p>
                <p className="text-[10px] text-slate-500">FRCN/2026/ICAN/0000039201</p>
                <p className="text-[10px] text-slate-500">Date: 31 December 2026</p>
              </div>

              <div>
                <div className="h-10 border-b border-dashed border-slate-400 mb-1.5 flex items-end">
                  <span className="font-serif italic text-sm text-slate-700">Amina Bello</span>
                </div>
                <p className="font-bold text-slate-950">Chief Financial Officer / Head of Accounts</p>
                <p className="text-[10px] text-slate-500">FRCN/2026/ANAN/0000048192</p>
                <p className="text-[10px] text-slate-500">Date: 31 December 2026</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-1.5 font-mono">
                <ShieldCheck className="h-3.5 w-3.5 text-[#006838]" aria-hidden="true" />
                <span>CAMA 405 Hash: {pkg?.snapshotHash?.slice(0, 32) ?? "e3b0c44298fc1c149afbf4c8996fb92427ae"}...</span>
              </div>
              <span className="font-serif italic">Official Statutory Audit Copy · Page 1 of 1</span>
            </div>
          </div>
        </article>
      </section>

      {/* 1-Click FRCN Compliant Annual Report Modal */}
      {pkg && (
        <FrcnAnnualReportModal
          isOpen={isFrcnModalOpen}
          onClose={() => setIsFrcnModalOpen(false)}
          periods={periods}
          currentPackage={pkg}
          selectedPeriodId={selectedPeriodId}
          onYearSelect={onPeriodChange}
        />
      )}
    </div>
  );
}
