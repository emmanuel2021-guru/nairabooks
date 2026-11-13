"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  FileSpreadsheet,
  Download,
  Printer,
  X,
  Building2,
  ShieldCheck,
  Award,
  CheckCircle2,
  Calendar,
  Sparkles,
  FileText,
  PieChart,
  TrendingUp,
  Receipt,
  Scale,
  ExternalLink,
} from "lucide-react";
import type { FiscalPeriod, FrcnFinancialStatementPackage } from "@/types/ledger";
import { exportFrcnPackageToExcel } from "@/lib/excel-export";

interface FrcnAnnualReportModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly periods: readonly FiscalPeriod[];
  readonly currentPackage: FrcnFinancialStatementPackage;
  readonly selectedPeriodId?: string;
  readonly onYearSelect?: (periodId: string) => void;
}

type TabSection =
  | "cover"
  | "cama405"
  | "auditor"
  | "financial-position"
  | "p-and-l"
  | "equity"
  | "cashflows"
  | "notes"
  | "value-added"
  | "five-year";

export function FrcnAnnualReportModal({
  isOpen,
  onClose,
  periods,
  currentPackage,
  selectedPeriodId,
  onYearSelect,
}: FrcnAnnualReportModalProps) {
  const prefersReduced = useReducedMotion();
  const [activeTab, setActiveTab] = useState<TabSection>("cover");
  const [activeYearId, setActiveYearId] = useState<string>(
    selectedPeriodId ?? periods[0]?.id ?? "22222222-2222-4222-8222-222222220002",
  );

  const selectedPeriod =
    periods.find((p) => p.id === activeYearId) ??
    periods[0] ?? {
      id: "22222222-2222-4222-8222-222222220002",
      label: "FY2026",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      status: "OPEN",
    };

  const handleYearChange = (newPeriodId: string) => {
    setActiveYearId(newPeriodId);
    if (onYearSelect) {
      onYearSelect(newPeriodId);
    }
  };

  const handleExportExcel = () => {
    exportFrcnPackageToExcel(
      currentPackage,
      selectedPeriod.label,
      "NairaBooks Enterprise Limited",
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    const originalTitle = document.title;
    document.title = `NairaBooks_FRCN_Annual_Report_${selectedPeriod.label}`;
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
    }, 200);
  };

  if (!isOpen) return null;

  const sections: { id: TabSection; label: string; icon: React.ReactNode }[] = [
    { id: "cover", label: "Cover & Corporate Info", icon: <Building2 className="h-4 w-4" /> },
    { id: "cama405", label: "CAMA 2020 Sec 405 Certification", icon: <ShieldCheck className="h-4 w-4 text-[#006838]" /> },
    { id: "auditor", label: "Independent Auditor's Report", icon: <Award className="h-4 w-4 text-[#0F4C81]" /> },
    { id: "financial-position", label: "Statement of Financial Position", icon: <Scale className="h-4 w-4 text-[#C25E00]" /> },
    { id: "p-and-l", label: "Profit or Loss (P&L)", icon: <FileSpreadsheet className="h-4 w-4 text-[#006838]" /> },
    { id: "equity", label: "Changes in Equity", icon: <PieChart className="h-4 w-4 text-[#6B21A8]" /> },
    { id: "cashflows", label: "Statement of Cash Flows", icon: <TrendingUp className="h-4 w-4 text-[#0F4C81]" /> },
    { id: "notes", label: "Notes to Financial Statements", icon: <FileText className="h-4 w-4 text-[#5E5E64]" /> },
    { id: "value-added", label: "Statement of Value Added (OND)", icon: <Receipt className="h-4 w-4 text-[#6B21A8]" /> },
    { id: "five-year", label: "Five-Year Financial Summary", icon: <TrendingUp className="h-4 w-4 text-[#854D0E]" /> },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="frcn-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      {/* Backdrop */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#1C1C1E]/60 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="relative z-10 flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-[#E5E5EA] bg-[#F7F7F9] shadow-2xl"
      >
        {/* Top Header Bar */}
        <div className="flex flex-col gap-3 border-b border-[#E5E5EA] bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E6F5ED] text-[#006838] shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="frcn-modal-title"
                  className="text-lg font-bold tracking-tight text-[#1C1C1E] sm:text-xl"
                >
                  FRCN &amp; CAMA 2020 Compliant Financial Report
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F5ED] px-2.5 py-0.5 text-[11px] font-bold text-[#006838]">
                  <Sparkles className="h-3 w-3" />
                  Official Model
                </span>
              </div>
              <p className="text-xs text-[#5E5E64]">
                Modeled after Financial Reporting Council of Nigeria (FRCN) &amp; CAMA Section 405 Audited Standards
              </p>
            </div>
          </div>

          {/* Year Picker & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-[#F2F2F7] px-3 py-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#5E5E64]" aria-hidden="true" />
              <label htmlFor="frcn-year-select" className="text-xs font-semibold text-[#1C1C1E]">
                Fiscal Year:
              </label>
              <select
                id="frcn-year-select"
                value={activeYearId}
                onChange={(e) => handleYearChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#006838] outline-none cursor-pointer"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} ({p.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Export Excel (.xlsx) */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#006838] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#00582E] active:scale-95"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export Excel (.xlsx)</span>
            </button>

            {/* Export PDF */}
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-red-200 bg-red-50/80 px-3.5 py-2 text-xs font-semibold text-red-900 transition hover:bg-red-100"
            >
              <FileText className="h-4 w-4 text-red-700" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>

            {/* Print / PDF */}
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Print report"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-3 py-2 text-xs font-semibold text-[#1C1C1E] transition hover:bg-[#F2F2F7]"
            >
              <Printer className="h-4 w-4 text-[#5E5E64]" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D1D1D6] bg-white text-[#5E5E64] transition hover:bg-[#F2F2F7] hover:text-[#1C1C1E]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body Layout: Sidebar Navigation + Main Report Document */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Index Nav */}
          <nav
            aria-label="FRCN Report Sections"
            className="hidden w-72 flex-shrink-0 flex-col border-r border-[#E5E5EA] bg-white p-3 md:flex overflow-y-auto"
          >
            <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#5E5E64]">
              Table of Contents
            </p>
            <div className="space-y-1">
              {sections.map((sec, idx) => {
                const isActive = activeTab === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveTab(sec.id)}
                    className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                      isActive
                        ? "bg-[#E6F5ED] text-[#006838] shadow-sm font-bold"
                        : "text-[#1C1C1E] hover:bg-[#F2F2F7]"
                    }`}
                  >
                    <span className="flex-shrink-0">{sec.icon}</span>
                    <span className="flex-1 truncate">{idx + 1}. {sec.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Status card in nav */}
            <div className="mt-auto pt-4">
              <div className="rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5] p-3 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#065F46]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Double-Entry Verified</span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-[#047857]">
                  {currentPackage.isBalanced
                    ? "Debit & Credit Variance: ₦0.00"
                    : "Unbalanced: Check Ledger"}
                </p>
                <div className="mt-2 truncate font-mono text-[10px] text-[#5E5E64]">
                  Hash: {currentPackage.snapshotHash.slice(0, 16)}...
                </div>
              </div>
            </div>
          </nav>

          {/* Right Main Content Viewer */}
          <main className="flex-1 overflow-y-auto bg-white p-6 sm:p-10">
            {/* Mobile Tab Selector */}
            <div className="mb-6 md:hidden">
              <label htmlFor="mobile-frcn-tab" className="block text-xs font-bold text-[#5E5E64] mb-1">
                Select Report Section:
              </label>
              <select
                id="mobile-frcn-tab"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as TabSection)}
                className="w-full rounded-xl border border-[#D1D1D6] bg-white p-2 text-xs font-semibold text-[#1C1C1E]"
              >
                {sections.map((sec, idx) => (
                  <option key={sec.id} value={sec.id}>
                    {idx + 1}. {sec.label}
                  </option>
                ))}
              </select>
            </div>

            {/* TAB CONTENT: 1. Cover & Corporate Information */}
            {activeTab === "cover" && (
              <div className="space-y-8 animate-fadeIn">
                <div className="rounded-[24px] border border-[#006838]/20 bg-gradient-to-br from-[#E6F5ED]/40 via-white to-[#FAFAFC] p-8 text-center shadow-sm">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#006838] text-white shadow-md">
                    <ShieldCheck className="h-10 w-10" />
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#006838]">
                    FINANCIAL REPORTING COUNCIL OF NIGERIA
                  </p>
                  <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#1C1C1E] sm:text-3xl">
                    AUDITED FINANCIAL STATEMENTS
                  </h1>
                  <p className="mt-1 text-sm font-semibold text-[#5E5E64]">
                    For the Financial Year Ended 31 December {selectedPeriod.label.replace(/\D/g, "") || "2026"}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#1C1C1E] shadow-sm border border-[#E5E5EA]">
                      CAMA 2020 Sec 405 Certified
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#006838] shadow-sm border border-[#006838]/30">
                      IFRS Compliant
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0F4C81] shadow-sm border border-[#0F4C81]/30">
                      Independent Auditor Attested
                    </span>
                  </div>
                </div>

                {/* Corporate Information Grid */}
                <div>
                  <h3 className="text-base font-bold text-[#1C1C1E] mb-3">Corporate Information</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#E5E5EA] bg-[#FAFAFC] p-4 text-xs">
                      <p className="font-bold text-[#5E5E64] uppercase text-[10px]">Head Office</p>
                      <p className="mt-1 font-semibold text-[#1C1C1E]">
                        Alexander House, Plot 8 Jobi Fele Way, Alausa, Ikeja, Lagos State, Nigeria
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#E5E5EA] bg-[#FAFAFC] p-4 text-xs">
                      <p className="font-bold text-[#5E5E64] uppercase text-[10px]">Principal Bankers</p>
                      <p className="mt-1 font-semibold text-[#1C1C1E]">
                        Central Bank of Nigeria (CBN), Zenith Bank Plc, Access Bank Plc
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#E5E5EA] bg-[#FAFAFC] p-4 text-xs">
                      <p className="font-bold text-[#5E5E64] uppercase text-[10px]">Independent External Auditors</p>
                      <p className="mt-1 font-semibold text-[#1C1C1E]">
                        PKF Professional Services (Benson O. Adejayan FCA, FRC/2013/PRO/ICAN/004/00000002226)
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#E5E5EA] bg-[#FAFAFC] p-4 text-xs">
                      <p className="font-bold text-[#5E5E64] uppercase text-[10px]">Statutory Legal Mandate</p>
                      <p className="mt-1 font-semibold text-[#1C1C1E]">
                        Financial Reporting Council of Nigeria Act No. 6 (2011) &amp; Companies and Allied Matters Act (CAMA 2020)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 2. CAMA 2020 Section 405 Certification */}
            {activeTab === "cama405" && (
              <div className="space-y-6">
                <div className="border-b border-[#E5E5EA] pb-4">
                  <span className="text-xs font-bold text-[#006838] uppercase">Statutory Requirement</span>
                  <h2 className="text-xl font-bold text-[#1C1C1E]">
                    CAMA 2020 Section 405 Certification of Audited Financial Statements
                  </h2>
                  <p className="text-xs text-[#5E5E64] mt-1">
                    Mandatory joint certification by Chief Executive Officer &amp; Chief Financial Officer
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E5E5EA] bg-[#FAFAFC] p-6 text-xs text-[#1C1C1E] leading-relaxed space-y-4">
                  <p>
                    We, the undersigned Executive Secretary/Chief Executive Officer and Coordinating Director/Chief Financial Officer
                    of the Financial Reporting Council of Nigeria, certify that:
                  </p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>We have reviewed the audited financial statements of the Council for the year ended 31 December {selectedPeriod.label.replace(/\D/g, "") || "2026"}.</li>
                    <li>
                      Based on our knowledge, these financial statements do not contain any untrue statement of a material fact
                      or omit to state a material fact necessary to make the statements made, in light of the circumstances under
                      which such statements were made, not misleading.
                    </li>
                    <li>
                      Based on our knowledge, the financial statements fairly present in all material respects the financial
                      condition and results of operations of the Council as of, and for, the periods presented.
                    </li>
                    <li>
                      We have designed and evaluated internal controls to ensure that material information relating to the Council
                      is made known to us by others within the entity, particularly during the period in which this report is being prepared.
                    </li>
                    <li>
                      We have evaluated the effectiveness of the Council&apos;s internal controls over financial reporting as of a date
                      within 90 days prior to the report and presented our conclusions.
                    </li>
                  </ol>
                </div>

                {/* Signatories Grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 pt-4">
                  <div className="rounded-2xl border border-[#006838]/20 bg-[#E6F5ED]/20 p-5">
                    <p className="text-[10px] font-bold text-[#006838] uppercase">Executive Secretary / CEO</p>
                    <p className="mt-2 text-base font-bold text-[#1C1C1E]">Dr. Rabiu Olowo</p>
                    <p className="font-mono text-xs text-[#5E5E64]">FRC/2020/PRO/ICAN/008/00000021804</p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#006838]">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Certified &amp; Signed 29 April 2026</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#006838]/20 bg-[#E6F5ED]/20 p-5">
                    <p className="text-[10px] font-bold text-[#006838] uppercase">Coordinating Director / CFO</p>
                    <p className="mt-2 text-base font-bold text-[#1C1C1E]">Charles Ose.Odafen</p>
                    <p className="font-mono text-xs text-[#5E5E64]">FRC/2024/PRO/ICAN/001/743499</p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#006838]">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Certified &amp; Signed 29 April 2026</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 3. Independent Auditor's Report */}
            {activeTab === "auditor" && (
              <div className="space-y-6">
                <div className="border-b border-[#E5E5EA] pb-4">
                  <span className="text-xs font-bold text-[#0F4C81] uppercase">External Independent Assurance</span>
                  <h2 className="text-xl font-bold text-[#1C1C1E]">Independent Auditor&apos;s Report</h2>
                  <p className="text-xs text-[#5E5E64] mt-1">
                    To the Members of Financial Reporting Council of Nigeria — Opinion on the Financial Statements
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E5E5EA] bg-[#FAFAFC] p-6 text-xs text-[#1C1C1E] leading-relaxed space-y-4">
                  <div className="rounded-xl border border-[#0F4C81]/20 bg-[#EAF3FC] p-4 text-[#0F4C81] font-semibold">
                    Unqualified Opinion: In our opinion, the accompanying financial statements give a true and fair view of the
                    financial position of the Council as at 31 December {selectedPeriod.label.replace(/\D/g, "") || "2026"}, and of its financial
                    performance and cash flows for the year then ended in accordance with International Financial Reporting
                    Standards (IFRS) and the requirements of the Financial Reporting Council of Nigeria Act and CAMA 2020.
                  </div>
                  <h4 className="font-bold text-sm text-[#1C1C1E]">Basis for Opinion</h4>
                  <p>
                    We conducted our audit in accordance with International Standards on Auditing (ISAs). Our responsibilities under
                    those standards are further described in the Auditor&apos;s Responsibilities for the Audit of the Financial Statements
                    section of our report. We are independent of the Council in accordance with the International Ethics Standards Board
                    for Accountants (IESBA).
                  </p>
                  <h4 className="font-bold text-sm text-[#1C1C1E]">Attestation on Internal Control Over Financial Reporting (ICFR)</h4>
                  <p>
                    We have audited the internal control over financial reporting of the Council based on criteria established in
                    Internal Control — Integrated Framework (2013) issued by the Committee of Sponsoring Organizations of the Treadway
                    Commission (COSO). In our opinion, the Council maintained in all material respects effective internal control over
                    financial reporting.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E5E5EA] bg-white p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="font-bold text-sm text-[#1C1C1E]">PKF Professional Services</p>
                      <p className="text-xs text-[#5E5E64]">Chartered Accountants, Lagos, Nigeria</p>
                      <p className="mt-1 font-mono text-xs text-[#006838]">Engagement Partner: Benson O. Adejayan FCA</p>
                      <p className="font-mono text-xs text-[#5E5E64]">FRC Registration: FRC/2013/PRO/ICAN/004/00000002226</p>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-[#006838]/30 bg-[#E6F5ED] p-3 text-xs font-bold text-[#006838]">
                      <Award className="h-6 w-6" />
                      <div>
                        <p>ICAN Practicing Seal</p>
                        <p className="font-mono">NO: 0207363</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 4. Statement of Financial Position (Balance Sheet) */}
            {activeTab === "financial-position" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E5E5EA] pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#1C1C1E]">Statement of Financial Position</h2>
                    <p className="text-xs text-[#5E5E64]">As at 31 December {selectedPeriod.label.replace(/\D/g, "") || "2026"}</p>
                  </div>
                  <span className="rounded-full bg-[#E6F5ED] px-3 py-1 text-xs font-bold text-[#006838]">
                    Amounts in Nigerian Naira (₦)
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#E5E5EA]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E5EA] bg-[#FAFAFC] font-bold text-[#5E5E64]">
                        <th scope="col" className="p-3">Assets &amp; Liabilities</th>
                        <th scope="col" className="p-3">IFRS Tag</th>
                        <th scope="col" className="p-3 text-right">Current Year ({selectedPeriod.label})</th>
                        <th scope="col" className="p-3 text-right">Comparative Year</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5EA]">
                      <tr className="bg-[#F7F7F9] font-bold text-[#1C1C1E]">
                        <td colSpan={4} className="p-2.5">Assets</td>
                      </tr>
                      {(currentPackage.financialPosition.assetLines ?? []).map((line) => (
                        <tr key={line.accountCode}>
                          <td className="p-3 pl-6 text-[#1C1C1E]">{line.accountName} ({line.accountCode})</td>
                          <td className="p-3 font-mono text-[#5E5E64]">{line.ifrsTag}</td>
                          <td className="p-3 text-right font-mono font-semibold text-[#1C1C1E]">₦{line.amountNgn}</td>
                          <td className="p-3 text-right font-mono text-[#5E5E64]">₦0.00</td>
                        </tr>
                      ))}
                      <tr className="bg-[#E6F5ED] font-bold text-[#006838]">
                        <td className="p-3">TOTAL ASSETS</td>
                        <td className="p-3"></td>
                        <td className="p-3 text-right font-mono text-sm">₦{currentPackage.financialPosition.totalAssetsNgn}</td>
                        <td className="p-3 text-right font-mono text-sm">₦0.00</td>
                      </tr>
                      <tr className="bg-[#F7F7F9] font-bold text-[#1C1C1E]">
                        <td colSpan={4} className="p-2.5">Liabilities</td>
                      </tr>
                      {(currentPackage.financialPosition.liabilityLines ?? []).map((line) => (
                        <tr key={line.accountCode}>
                          <td className="p-3 pl-6 text-[#1C1C1E]">{line.accountName} ({line.accountCode})</td>
                          <td className="p-3 font-mono text-[#5E5E64]">{line.ifrsTag}</td>
                          <td className="p-3 text-right font-mono font-semibold text-[#1C1C1E]">₦{line.amountNgn}</td>
                          <td className="p-3 text-right font-mono text-[#5E5E64]">₦0.00</td>
                        </tr>
                      ))}
                      <tr className="bg-[#FAFAFC] font-bold text-[#1C1C1E]">
                        <td className="p-3">TOTAL LIABILITIES</td>
                        <td className="p-3"></td>
                        <td className="p-3 text-right font-mono">₦{currentPackage.financialPosition.totalLiabilitiesNgn}</td>
                        <td className="p-3 text-right font-mono text-[#5E5E64]">₦0.00</td>
                      </tr>
                      <tr className="bg-[#F7F7F9] font-bold text-[#1C1C1E]">
                        <td colSpan={4} className="p-2.5">Equity and Reserves</td>
                      </tr>
                      {(currentPackage.financialPosition.equityLines ?? []).map((line) => (
                        <tr key={line.accountCode}>
                          <td className="p-3 pl-6 text-[#1C1C1E]">{line.accountName} ({line.accountCode})</td>
                          <td className="p-3 font-mono text-[#5E5E64]">{line.ifrsTag}</td>
                          <td className="p-3 text-right font-mono font-semibold text-[#1C1C1E]">₦{line.amountNgn}</td>
                          <td className="p-3 text-right font-mono text-[#5E5E64]">₦0.00</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="p-3 pl-6 text-[#1C1C1E]">Retained &amp; Current Surplus</td>
                        <td className="p-3 font-mono text-[#5E5E64]">RETAINED_EARNINGS</td>
                        <td className="p-3 text-right font-mono font-semibold text-[#1C1C1E]">
                          ₦{currentPackage.financialPosition.retainedAndCurrentEarningsNgn}
                        </td>
                        <td className="p-3 text-right font-mono text-[#5E5E64]">₦0.00</td>
                      </tr>
                      <tr className="bg-[#E6F5ED] font-bold text-[#006838]">
                        <td className="p-3">TOTAL EQUITY</td>
                        <td className="p-3"></td>
                        <td className="p-3 text-right font-mono text-sm">₦{currentPackage.financialPosition.totalEquityNgn}</td>
                        <td className="p-3 text-right font-mono text-sm">₦0.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 5. Statement of Profit or Loss (P&L) */}
            {activeTab === "p-and-l" && (
              <div className="space-y-6">
                <div className="border-b border-[#E5E5EA] pb-4">
                  <h2 className="text-xl font-bold text-[#1C1C1E]">Statement of Profit or Loss</h2>
                  <p className="text-xs text-[#5E5E64]">
                    For the Year Ended 31 December {selectedPeriod.label.replace(/\D/g, "") || "2026"} (IFRS &amp; CAMA 2020)
                  </p>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#E5E5EA]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E5EA] bg-[#FAFAFC] font-bold text-[#5E5E64]">
                        <th scope="col" className="p-3">Revenue &amp; Expenditure Item</th>
                        <th scope="col" className="p-3">IFRS Tag</th>
                        <th scope="col" className="p-3 text-right">Amount (₦)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5EA]">
                      {(currentPackage.profitAndLoss.revenueLines ?? []).map((rev) => (
                        <tr key={rev.accountCode}>
                          <td className="p-3 font-semibold text-[#1C1C1E]">{rev.accountName} ({rev.accountCode})</td>
                          <td className="p-3 font-mono text-[#5E5E64]">{rev.ifrsTag}</td>
                          <td className="p-3 text-right font-mono font-semibold text-[#1C1C1E]">₦{rev.amountNgn}</td>
                        </tr>
                      ))}
                      <tr className="bg-[#FAFAFC] font-bold text-[#006838]">
                        <td className="p-3">TOTAL REVENUE</td>
                        <td></td>
                        <td className="p-3 text-right font-mono">₦{currentPackage.profitAndLoss.totalRevenueNgn}</td>
                      </tr>
                      {(currentPackage.profitAndLoss.operatingExpenseLines ?? []).map((exp) => (
                        <tr key={exp.accountCode}>
                          <td className="p-3 text-[#1C1C1E]">{exp.accountName} ({exp.accountCode})</td>
                          <td className="p-3 font-mono text-[#5E5E64]">{exp.ifrsTag}</td>
                          <td className="p-3 text-right font-mono font-semibold text-[#B91C1C]">(₦{exp.amountNgn})</td>
                        </tr>
                      ))}
                      <tr className="bg-[#FAFAFC] font-bold text-[#B91C1C]">
                        <td className="p-3">TOTAL OPERATING EXPENSES</td>
                        <td></td>
                        <td className="p-3 text-right font-mono">(₦{currentPackage.profitAndLoss.operatingExpensesNgn})</td>
                      </tr>
                      <tr className="bg-[#E6F5ED] font-bold text-[#006838]">
                        <td className="p-3">SURPLUS / (NET PROFIT) FOR THE YEAR</td>
                        <td className="p-3"></td>
                        <td className="p-3 text-right font-mono text-sm">₦{currentPackage.profitAndLoss.netProfitNgn}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 6. Statement of Changes in Equity */}
            {activeTab === "equity" && (
              <div className="space-y-6">
                <div className="border-b border-[#E5E5EA] pb-4">
                  <h2 className="text-xl font-bold text-[#1C1C1E]">Statement of Changes in Equity / Reserves</h2>
                  <p className="text-xs text-[#5E5E64]">Contributed Capital &amp; Retained Surplus Movement</p>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#E5E5EA]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E5EA] bg-[#FAFAFC] font-bold text-[#5E5E64]">
                        <th scope="col" className="p-3">Equity Classification</th>
                        <th scope="col" className="p-3 text-right">Opening Balance</th>
                        <th scope="col" className="p-3 text-right">Movement</th>
                        <th scope="col" className="p-3 text-right">Total Equity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5EA]">
                      <tr>
                        <td className="p-3 font-semibold text-[#1C1C1E]">Total Owners&apos; Equity &amp; Reserves</td>
                        <td className="p-3 text-right font-mono">
                          ₦{(Number(currentPackage.financialPosition.totalEquityNgn) - Number(currentPackage.profitAndLoss.netProfitNgn)).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono text-[#006838]">
                          +₦{currentPackage.profitAndLoss.netProfitNgn}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">₦{currentPackage.financialPosition.totalEquityNgn}</td>
                      </tr>
                      <tr className="bg-[#E6F5ED] font-bold text-[#006838]">
                        <td className="p-3">Balance as at 31 December ({selectedPeriod.label})</td>
                        <td className="p-3"></td>
                        <td className="p-3"></td>
                        <td className="p-3 text-right font-mono text-sm">₦{currentPackage.financialPosition.totalEquityNgn}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 7. Statement of Cash Flows */}
            {activeTab === "cashflows" && (
              <div className="space-y-6">
                <div className="border-b border-[#E5E5EA] pb-4">
                  <h2 className="text-xl font-bold text-[#1C1C1E]">Statement of Cash Flows (IAS 7)</h2>
                  <p className="text-xs text-[#5E5E64]">Direct Method Inflows &amp; Outflows</p>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#E5E5EA]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E5EA] bg-[#FAFAFC] font-bold text-[#5E5E64]">
                        <th scope="col" className="p-3">Activity</th>
                        <th scope="col" className="p-3">Classification</th>
                        <th scope="col" className="p-3 text-right">Net Flow (₦)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5EA]">
                      <tr>
                        <td className="p-3 font-semibold text-[#1C1C1E]">Cash Receipts from Operating Inflows</td>
                        <td className="p-3 font-mono text-[#5E5E64]">REVENUE_INFLOW</td>
                        <td className="p-3 text-right font-mono font-semibold">₦{currentPackage.profitAndLoss.totalRevenueNgn}</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-[#1C1C1E]">Cash Paid to Suppliers &amp; Employees</td>
                        <td className="p-3 font-mono text-[#5E5E64]">EXPENSE_OUTFLOW</td>
                        <td className="p-3 text-right font-mono text-[#B91C1C]">(₦{currentPackage.profitAndLoss.operatingExpensesNgn})</td>
                      </tr>
                      <tr className="bg-[#FAFAFC] font-bold">
                        <td className="p-3">Net Cash from Operating Activities</td>
                        <td></td>
                        <td className="p-3 text-right font-mono">₦{currentPackage.profitAndLoss.netProfitNgn}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-[#1C1C1E]">Financing Contributed Capital / Equity</td>
                        <td className="p-3 font-mono text-[#5E5E64]">EQUITY_CONTRIBUTION</td>
                        <td className="p-3 text-right font-mono">₦{currentPackage.financialPosition.totalEquityNgn}</td>
                      </tr>
                      <tr className="bg-[#E6F5ED] font-bold text-[#006838]">
                        <td className="p-3">Cash &amp; Cash Equivalents at 31 December</td>
                        <td className="p-3 font-mono">CASH_AND_EQUIVALENTS</td>
                        <td className="p-3 text-right font-mono text-sm">₦{currentPackage.financialPosition.totalAssetsNgn}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 8. Notes to Financial Statements */}
            {activeTab === "notes" && (
              <div className="space-y-6">
                <div className="border-b border-[#E5E5EA] pb-4">
                  <h2 className="text-xl font-bold text-[#1C1C1E]">Notes 1–26 to the Financial Statements</h2>
                  <p className="text-xs text-[#5E5E64]">Summary of Material IFRS Policies &amp; Statutory Disclosures</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                  <div className="rounded-2xl border border-[#E5E5EA] bg-[#FAFAFC] p-4">
                    <p className="font-bold text-[#006838]">Note 1: Reporting Entity</p>
                    <p className="mt-1 text-[#5E5E64]">
                      Financial Reporting Council of Nigeria, established under FRCN Act No. 6 (2011) to regulate accounting and auditing standards.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#E5E5EA] bg-[#FAFAFC] p-4">
                    <p className="font-bold text-[#006838]">Note 2: Basis of Preparation</p>
                    <p className="mt-1 text-[#5E5E64]">
                      Prepared in accordance with IFRS, CAMA 2020 Sec 405, and on the historical cost convention.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#E5E5EA] bg-[#FAFAFC] p-4">
                    <p className="font-bold text-[#006838]">Note 3: Functional Currency</p>
                    <p className="mt-1 text-[#5E5E64]">
                      Nigerian Naira (₦), which is the currency of the primary economic environment under IAS 21.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#E5E5EA] bg-[#FAFAFC] p-4">
                    <p className="font-bold text-[#006838]">Note 4: Revenue from Contracts (IFRS 15)</p>
                    <p className="mt-1 text-[#5E5E64]">
                      Statutory annual levies, practitioner registrations, and consultative services recognized when performance obligations are met.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 9. Statement of Value Added (OND Page 41) */}
            {activeTab === "value-added" && (
              <div className="space-y-6">
                <div className="border-b border-[#E5E5EA] pb-4">
                  <span className="text-xs font-bold text-[#6B21A8] uppercase">Other National Disclosures (Page 41)</span>
                  <h2 className="text-xl font-bold text-[#1C1C1E]">Statement of Value Added</h2>
                  <p className="text-xs text-[#5E5E64]">
                    Wealth created by the Council&apos;s operations and how it was distributed among stakeholders
                  </p>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#E5E5EA]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E5EA] bg-[#FAFAFC] font-bold text-[#5E5E64]">
                        <th scope="col" className="p-3">Value Added Component</th>
                        <th scope="col" className="p-3 text-right">Amount (₦)</th>
                        <th scope="col" className="p-3 text-right">Distribution (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5EA]">
                      {currentPackage.valueAddedStatement.map((va) => (
                        <tr
                          key={va.lineLabel}
                          className={va.lineLabel.includes("Value Added") ? "bg-[#F3E8FF] font-bold text-[#6B21A8]" : ""}
                        >
                          <td className="p-3 text-[#1C1C1E]">{va.lineLabel}</td>
                          <td className="p-3 text-right font-mono font-semibold">₦{va.amountNgn}</td>
                          <td className="p-3 text-right font-mono font-bold">{va.percentageShare}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 10. Five-Year Financial Summary (OND Page 42) */}
            {activeTab === "five-year" && (
              <div className="space-y-6">
                <div className="border-b border-[#E5E5EA] pb-4">
                  <span className="text-xs font-bold text-[#854D0E] uppercase">Other National Disclosures (Page 42)</span>
                  <h2 className="text-xl font-bold text-[#1C1C1E]">Five-Year Financial Summary</h2>
                  <p className="text-xs text-[#5E5E64]">Multi-Year Comparative Performance &amp; Asset Growth</p>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#E5E5EA]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E5EA] bg-[#FAFAFC] font-bold text-[#5E5E64]">
                        <th scope="col" className="p-3">Fiscal Year</th>
                        <th scope="col" className="p-3 text-right">Total Assets (₦)</th>
                        <th scope="col" className="p-3 text-right">Gross Revenue (₦)</th>
                        <th scope="col" className="p-3 text-right">Profit Before Tax (₦)</th>
                        <th scope="col" className="p-3 text-right">Net Equity (₦)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5EA]">
                      {currentPackage.fiveYearSummary.map((fy) => (
                        <tr key={fy.fiscalYearLabel} className={fy.fiscalYearLabel === selectedPeriod.label ? "bg-[#FEF9C3] font-bold" : ""}>
                          <td className="p-3 font-bold text-[#1C1C1E]">{fy.fiscalYearLabel}</td>
                          <td className="p-3 text-right font-mono">₦{fy.totalAssetsNgn}</td>
                          <td className="p-3 text-right font-mono">₦{fy.revenueNgn}</td>
                          <td className="p-3 text-right font-mono">₦{fy.profitBeforeTaxNgn}</td>
                          <td className="p-3 text-right font-mono font-semibold">₦{fy.netEquityNgn}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>
        </div>
      </motion.div>
    </div>
  );
}
