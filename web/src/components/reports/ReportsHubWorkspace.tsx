"use client";

import React, { useId, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Receipt,
  Scale,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useWorkspaceMode } from "@/state/workspace-mode";
import type {
  FiscalPeriod,
  FrcnFinancialStatementPackage,
  MutationError,
} from "@/types/ledger";
import {
  getReportDefinition,
  getReportsByCategory,
  REPORT_CATEGORIES,
  REPORTS_CATALOG,
  type ReportCategoryKey,
  type ReportDefinition,
} from "./reports-data";
import { ReportIconBadge } from "./ReportIconBadge";
import { ReportViewer } from "./ReportViewer";
import { FrcnAnnualReportModal } from "./FrcnAnnualReportModal";
import { exportFrcnPackageToExcel } from "@/lib/excel-export";

interface ReportsHubWorkspaceProps {
  readonly periods: readonly FiscalPeriod[];
  readonly initialPackage: FrcnFinancialStatementPackage;
  readonly defaultReportId?: string | null;
}

export function ReportsHubWorkspace({
  periods,
  initialPackage,
  defaultReportId = null,
}: ReportsHubWorkspaceProps) {
  const { mode } = useWorkspaceMode();
  const prefersReduced = useReducedMotion();
  const catalogSearchId = useId();

  // State
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    initialPackage.fiscalPeriodId,
  );
  const [pkg, setPkg] = useState<FrcnFinancialStatementPackage>(initialPackage);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Active Report State (null = browse catalog, string = viewing that report)
  const [activeReportId, setActiveReportId] = useState<string | null>(defaultReportId);

  // 1-Click FRCN Annual Report Modal State
  const [isFrcnModalOpen, setIsFrcnModalOpen] = useState(false);

  // Catalog Filters
  const [selectedCategory, setSelectedCategory] = useState<ReportCategoryKey | "all">(
    "all",
  );
  const [catalogSearch, setCatalogSearch] = useState("");

  const handlePeriodChange = (periodId: string) => {
    setSelectedPeriodId(periodId);
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/ledger/reports/frcn?fiscalPeriodId=${encodeURIComponent(periodId)}`,
        );
        const body = (await res.json()) as
          | FrcnFinancialStatementPackage
          | MutationError;
        if (!res.ok || !("trialBalance" in body)) {
          setErrorMsg(
            "message" in body ? body.message : "Could not load FRCN statements.",
          );
          return;
        }
        setPkg(body);
      } catch {
        setErrorMsg("Network error while loading FRCN statements.");
      }
    });
  };

  const activeReport = activeReportId ? getReportDefinition(activeReportId) : null;

  // Filter catalog reports
  const displayedCatalogReports = REPORTS_CATALOG.filter((report) => {
    if (selectedCategory !== "all" && report.category !== selectedCategory) {
      return false;
    }
    if (catalogSearch.trim()) {
      const q = catalogSearch.toLowerCase();
      const matchTitle = report.title.toLowerCase().includes(q);
      const matchSummary = report.summary.toLowerCase().includes(q);
      const matchTags = report.tags.some((t) => t.toLowerCase().includes(q));
      const matchStandard = report.statutoryStandard.toLowerCase().includes(q);
      return matchTitle || matchSummary || matchTags || matchStandard;
    }
    return true;
  });

  const activePeriodLabel =
    periods.find((p) => p.id === selectedPeriodId)?.label ?? "FY2026";

  const handleExportFullExcel = () => {
    exportFrcnPackageToExcel(
      pkg,
      activePeriodLabel,
      "NairaBooks Enterprise Limited",
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 pb-sticky-clearance">
      {/* Global Error Banner */}
      {errorMsg && (
        <div
          role="alert"
          className="rounded-[16px] border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-xs font-semibold text-[#B91C1C]"
        >
          {errorMsg}
        </div>
      )}

      {/* VIEW MODE: If user clicked a report, render the interactive ReportViewer */}
      {activeReport ? (
        <ReportViewer
          report={activeReport}
          pkg={pkg}
          periods={periods}
          selectedPeriodId={selectedPeriodId}
          onPeriodChange={handlePeriodChange}
          isPending={isPending}
          onBack={() => setActiveReportId(null)}
          workspaceMode={mode}
        />
      ) : (
        /* CATALOG MODE: Browse 15 FRCN & IFRS Reports across 10 Pillars */
        <div className="space-y-6">
          {/* 1. Header with Title & Tax Engine Link */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 items-center rounded-full bg-[#E6F5ED] px-2.5 text-[11px] font-bold text-[#006838]">
                  FRCN &amp; IFRS Compliant Suite
                </span>
                <span className="text-xs text-[#5E5E64]">
                  {REPORTS_CATALOG.length} Reports · 10 Pillars
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#1C1C1E] sm:text-3xl">
                Financial &amp; Operational Reports
              </h1>
              <p className="mt-1 text-xs text-[#5E5E64] max-w-2xl">
                {mode === "simple"
                  ? "Simple Mode: View clear summaries of what your business earned, owes, owns, and statutory wealth shared."
                  : "Pro Mode: Audit-ready IFRS financial statements, aging schedules, general ledger registers, and CAMA Section 405 hash-chain verification."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/tax"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#006838] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#00582E] shadow-sm"
              >
                <span>Nigerian Tax Rules &amp; NRS</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* 2. FRCN Statutory Equilibrium & 1-Click Annual Report Generator Banner */}
          <div className="rounded-[24px] border border-[#A7F3D0] bg-gradient-to-r from-[#ECFDF5] via-white to-[#F0FDF4] p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#006838] text-white shadow-sm">
                  <Scale className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#006838]">
                      Statutory Equilibrium &amp; CAMA 405
                    </span>
                    <span
                      data-testid="frcn-balance-status"
                      aria-live="polite"
                      className="inline-flex items-center gap-1 rounded-full bg-[#E6F5ED] px-2.5 py-0.5 text-xs font-bold text-[#006838]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {pkg.isBalanced ? "Balanced (0.00 variance)" : "Unbalanced"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#5E5E64]">
                    Double-entry verified: Total Debits{" "}
                    <strong className="text-[#1C1C1E] font-mono">₦{pkg.totalDebitsNgn}</strong> · Total Credits{" "}
                    <strong className="text-[#1C1C1E] font-mono">₦{pkg.totalCreditsNgn}</strong>
                  </p>
                  {mode === "pro" && (
                    <p className="mt-1 font-mono text-[11px] text-[#5E5E64] truncate max-w-xl">
                      SHA-256 CAMA Sec 405 Digest: <span className="text-[#006838] font-bold">{pkg.snapshotHash}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* 1-Click Generation & Excel Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFrcnModalOpen(true)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#006838] px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#00582E] hover:shadow-lg active:scale-95"
                >
                  <Sparkles className="h-4 w-4 text-amber-300" aria-hidden="true" />
                  <span>Generate FRCN Compliant Annual Report</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportFullExcel}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-4 py-2 text-xs font-semibold text-[#1C1C1E] transition hover:bg-[#FAFAFC] hover:border-[#006838]"
                >
                  <FileSpreadsheet className="h-4 w-4 text-[#006838]" aria-hidden="true" />
                  <span>Export Excel (.xlsx)</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Spotlight: Five Core Nigerian Statutory Reports */}
          <div className="rounded-[24px] border border-[#E5E5EA] bg-white p-5 shadow-[0_4px_16px_rgba(28,28,30,0.03)]">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#006838]" aria-hidden="true" />
                <h2 className="text-sm font-bold text-[#1C1C1E]">
                  Featured Statutory &amp; Executive Statements
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-[#5E5E64]">
                Instant drilldown into verified ledger figures
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                {
                  id: "trial-balance",
                  title: "General Ledger Trial Balance",
                  subtitle: pkg.isBalanced ? "Balanced (0.00)" : "Check Entries",
                  iconKey: "scale",
                  tintBg: "#E6F5ED",
                  tintText: "#006838",
                },
                {
                  id: "income-statement",
                  title: "Profit & Loss (Income Stmnt)",
                  subtitle: `Net: ₦${pkg.profitAndLoss.netProfitNgn}`,
                  iconKey: "file-spreadsheet",
                  tintBg: "#EAF3FC",
                  tintText: "#0F4C81",
                },
                {
                  id: "balance-sheet",
                  title: "Balance Sheet (Financial Pos.)",
                  subtitle: `Assets: ₦${pkg.financialPosition.totalAssetsNgn}`,
                  iconKey: "banknote",
                  tintBg: "#FDF2E9",
                  tintText: "#C25E00",
                },
                {
                  id: "value-added",
                  title: "FRCN Statement of Value Added",
                  subtitle: "Statutory Wealth Share",
                  iconKey: "receipt",
                  tintBg: "#F3E8FF",
                  tintText: "#6B21A8",
                },
                {
                  id: "five-year-summary",
                  title: "FRCN Five-Year Summary",
                  subtitle: "Historical Growth Trends",
                  iconKey: "book-open",
                  tintBg: "#FEF9C3",
                  tintText: "#854D0E",
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveReportId(item.id)}
                  className="nb-crisp-card-lift group flex flex-col justify-between rounded-[18px] border border-[#E5E5EA] bg-[#FAFAFC] p-3.5 text-left hover:border-[#006838] hover:bg-white hover:shadow-[0_8px_20px_rgba(0,104,56,0.08)]"
                >
                  <div className="flex items-start justify-between">
                    <ReportIconBadge
                      iconKey={item.iconKey}
                      tintBg={item.tintBg}
                      tintText={item.tintText}
                      size="sm"
                    />
                    <ChevronRight className="h-4 w-4 text-[#5E5E64] transition group-hover:translate-x-0.5 group-hover:text-[#006838]" />
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-bold text-[#1C1C1E] group-hover:text-[#006838]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] font-semibold text-[#5E5E64]">
                      {item.subtitle}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Search & 10 Category Switcher Bar */}
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5E5E64]"
                  aria-hidden="true"
                />
                <input
                  id={catalogSearchId}
                  type="search"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search 15 reports by title, keyword, standard..."
                  className="w-full rounded-full border border-[#D1D1D6] bg-white py-2 pl-10 pr-4 text-xs font-medium text-[#1C1C1E] placeholder:text-[#5E5E64] focus:border-[#006838] focus:outline-none focus:ring-1 focus:ring-[#006838]"
                />
              </div>

              {/* Counter */}
              <p className="text-xs font-semibold text-[#5E5E64]">
                Showing{" "}
                <span className="font-bold text-[#1C1C1E]">
                  {displayedCatalogReports.length}
                </span>{" "}
                of {REPORTS_CATALOG.length} reports
              </p>
            </div>

            {/* Pillar Filter Tabs */}
            <div
              role="tablist"
              aria-label="Report Categories"
              className="flex items-center gap-1.5 overflow-x-auto pb-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={selectedCategory === "all"}
                onClick={() => setSelectedCategory("all")}
                className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  selectedCategory === "all"
                    ? "bg-[#1C1C1E] text-white shadow-sm"
                    : "bg-[#FAFAFC] text-[#5E5E64] hover:bg-white hover:text-[#1C1C1E] border border-[#E5E5EA]"
                }`}
              >
                All Reports ({REPORTS_CATALOG.length})
              </button>

              {REPORT_CATEGORIES.map((cat) => {
                const count = getReportsByCategory(cat.key).length;
                const isSelected = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      isSelected
                        ? "bg-[#006838] text-white shadow-sm"
                        : "bg-[#FAFAFC] text-[#5E5E64] hover:bg-white hover:text-[#1C1C1E] border border-[#E5E5EA]"
                    }`}
                  >
                    <span>{cat.shortLabel}</span>
                    <span
                      className={`rounded-full px-1.5 text-[10px] font-bold ${
                        isSelected ? "bg-white/20 text-white" : "bg-[#E5E5EA] text-[#5E5E64]"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Catalog Reports Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayedCatalogReports.map((rep) => {
              const cat =
                REPORT_CATEGORIES.find((c) => c.key === rep.category) ??
                REPORT_CATEGORIES[0]!;

              return (
                <div
                  key={rep.id}
                  className="nb-crisp-card-lift flex flex-col justify-between rounded-[22px] border border-[#E5E5EA] bg-white p-5 shadow-[0_2px_12px_rgba(28,28,30,0.03)] hover:border-[#0F4C81]/50 hover:shadow-[0_12px_26px_rgba(15,76,129,0.08)]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <ReportIconBadge
                        iconKey={cat.iconKey}
                        tintBg={cat.tintBg}
                        tintText={cat.tintText}
                        size="md"
                      />
                      <span
                        style={{ backgroundColor: cat.tintBg, color: cat.tintText }}
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                      >
                        {cat.shortLabel}
                      </span>
                    </div>

                    <h3 className="mt-3 text-sm font-bold text-[#1C1C1E]">
                      {rep.title}
                    </h3>
                    <p className="mt-0.5 text-[11px] font-mono text-[#006838] font-semibold">
                      Standard: {rep.statutoryStandard}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs text-[#5E5E64]">
                      {rep.summary}
                    </p>
                  </div>

                  <div className="mt-4 border-t border-[#E5E5EA] pt-3">
                    <div className="mb-3 flex flex-wrap gap-1">
                      {rep.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[#FAFAFC] px-2 py-0.5 text-[10px] font-medium text-[#5E5E64]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveReportId(rep.id)}
                      className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white text-xs font-semibold text-[#1C1C1E] transition hover:border-[#006838] hover:bg-[#E6F5ED] hover:text-[#006838]"
                    >
                      <span>View &amp; Customize Report</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 1-Click FRCN Compliant Annual Report Modal */}
      <FrcnAnnualReportModal
        isOpen={isFrcnModalOpen}
        onClose={() => setIsFrcnModalOpen(false)}
        periods={periods}
        currentPackage={pkg}
        selectedPeriodId={selectedPeriodId}
        onYearSelect={handlePeriodChange}
      />
    </div>
  );
}
