"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Award,
  Building2,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  LogOut,
  Palette,
  RefreshCw,
  Save,
  Scale,
  Settings,
  ShieldCheck,
  Sliders,
  Sparkles,
  X,
} from "lucide-react";
import { useWorkspaceMode } from "@/state/workspace-mode";
import {
  ART_INTENSITIES,
  ART_MOTIFS,
  getInitialArtTheme,
  saveArtTheme,
  type NigerianArtIntensity,
  type NigerianArtMotif,
} from "@/lib/art-theme";

interface FileSettingsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function FileSettingsModal({ isOpen, onClose }: FileSettingsModalProps) {
  const { mode, setMode } = useWorkspaceMode();
  const prefersReduced = useReducedMotion();
  const [activeTab, setActiveTab] = useState<"profile" | "tax" | "files" | "preferences">("profile");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [artTheme, setArtTheme] = useState(() => getInitialArtTheme());

  const handleArtMotifChange = (motif: NigerianArtMotif) => {
    const updated = saveArtTheme({ motif });
    setArtTheme(updated);
    const meta = ART_MOTIFS.find((m) => m.id === motif);
    setStatusMessage(`Activated Nigerian background artwork: ${meta?.name ?? motif}.`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleArtIntensityChange = (intensity: NigerianArtIntensity) => {
    const updated = saveArtTheme({ intensity });
    setArtTheme(updated);
    const meta = ART_INTENSITIES.find((i) => i.id === intensity);
    setStatusMessage(`Artwork intensity set to ${meta?.label ?? intensity}.`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportBackupJson = () => {
    const backupData = {
      app: "NairaBooks Operating Suite",
      version: "2026.1",
      exportedAt: new Date().toISOString(),
      entity: {
        legalName: "NairaBooks Enterprise Limited",
        rcNumber: "RC-1849204",
        tin: "28491048-0001",
        vatRegistration: "10482910-0001",
        address: "Plot 12, Commercial Avenue, Victoria Island, Lagos, Nigeria",
        baseCurrency: "NGN",
      },
      statutoryStandards: {
        accounting: "IFRS for Small & Medium Entities / CAMA 2020",
        taxAct: "Nigeria Tax Act 2025 (0% CIT Exemption Active)",
        vatRate: "7.5%",
      },
      integritySeal: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nairabooks-company-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatusMessage("Company financial backup exported successfully.");
    setTimeout(() => setStatusMessage(null), 3500);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="file-settings-title"
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

      {/* Main Dialog Container */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={prefersReduced ? undefined : { opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
        className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[24px] border border-[#E5E5EA] bg-white shadow-2xl"
      >
        {/* Header Ribbon (Desktop "File" & Settings Bar) */}
        <div className="flex items-center justify-between border-b border-[#E5E5EA] bg-[#F2F2F7] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#006838] text-white shadow-sm">
              <span className="text-base font-bold">₦</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="file-settings-title" className="text-sm font-bold text-[#1C1C1E]">
                  NairaBooks Enterprise Limited
                </h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-[#00582E]">
                  RC 1849204
                </span>
              </div>
              <p className="text-[11px] text-[#5E5E64]">
                Operating Settings, Company Profile &amp; Data Operations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings dialog"
            className="rounded-full p-2 text-[#5E5E64] transition hover:bg-[#E5E5EA] hover:text-[#1C1C1E]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Status Toast Banner */}
        {statusMessage && (
          <div
            role="status"
            className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-6 py-2.5 text-xs font-semibold text-[#00582E]"
          >
            <Check className="h-4 w-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Horizontal Navigation Tabs (Like File Menu Categories) */}
        <div className="flex border-b border-[#E5E5EA] bg-white px-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`min-h-[44px] border-b-2 px-3 text-xs font-bold transition whitespace-nowrap ${
              activeTab === "profile"
                ? "border-[#006838] text-[#006838]"
                : "border-transparent text-[#5E5E64] hover:text-[#1C1C1E]"
            }`}
          >
            Company Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tax")}
            className={`min-h-[44px] border-b-2 px-3 text-xs font-bold transition whitespace-nowrap ${
              activeTab === "tax"
                ? "border-[#006838] text-[#006838]"
                : "border-transparent text-[#5E5E64] hover:text-[#1C1C1E]"
            }`}
          >
            Statutory &amp; Tax Act
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("files")}
            className={`min-h-[44px] border-b-2 px-3 text-xs font-bold transition whitespace-nowrap ${
              activeTab === "files"
                ? "border-[#006838] text-[#006838]"
                : "border-transparent text-[#5E5E64] hover:text-[#1C1C1E]"
            }`}
          >
            File &amp; Backup Operations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preferences")}
            className={`min-h-[44px] border-b-2 px-3 text-xs font-bold transition whitespace-nowrap ${
              activeTab === "preferences"
                ? "border-[#006838] text-[#006838]"
                : "border-transparent text-[#5E5E64] hover:text-[#1C1C1E]"
            }`}
          >
            App Preferences
          </button>
        </div>

        {/* Body Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4 text-xs">
          {activeTab === "profile" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#E5E5EA] bg-[#FAFAFC] p-4 space-y-3">
                <h3 className="font-bold text-sm text-[#1C1C1E] flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#006838]" />
                  <span>Official Corporate Identification</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl border border-[#E5E5EA] bg-white p-3">
                    <span className="text-[10px] uppercase font-semibold text-[#5E5E64]">Legal Registered Name</span>
                    <p className="font-bold text-[#1C1C1E] mt-0.5">NairaBooks Enterprise Limited</p>
                  </div>
                  <div className="rounded-xl border border-[#E5E5EA] bg-white p-3">
                    <span className="text-[10px] uppercase font-semibold text-[#5E5E64]">Corporate Affairs Commission (CAC)</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="font-mono font-bold text-[#1C1C1E]">RC-1849204</p>
                      <button
                        type="button"
                        onClick={() => handleCopy("RC-1849204", "rc")}
                        className="text-[10px] font-semibold text-[#006838] hover:underline"
                      >
                        {copiedKey === "rc" ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#E5E5EA] bg-white p-3">
                    <span className="text-[10px] uppercase font-semibold text-[#5E5E64]">Tax Identification Number (TIN)</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="font-mono font-bold text-[#1C1C1E]">28491048-0001</p>
                      <button
                        type="button"
                        onClick={() => handleCopy("28491048-0001", "tin")}
                        className="text-[10px] font-semibold text-[#006838] hover:underline"
                      >
                        {copiedKey === "tin" ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#E5E5EA] bg-white p-3">
                    <span className="text-[10px] uppercase font-semibold text-[#5E5E64]">Registered Office Address</span>
                    <p className="text-[#1C1C1E] mt-0.5">Plot 12, Commercial Avenue, Victoria Island, Lagos</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E5E5EA] bg-white p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#1C1C1E]">Functional Base Currency</p>
                  <p className="text-[11px] text-[#5E5E64]">IAS 21 functional currency for double-entry records</p>
                </div>
                <span className="font-mono font-bold text-xs rounded-full bg-[#E6F5ED] px-3 py-1 text-[#00582E]">
                  NGN (₦) Nigerian Naira
                </span>
              </div>
            </div>
          )}

          {activeTab === "tax" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-950 font-bold">
                  <ShieldCheck className="h-4 w-4 text-[#006838]" />
                  <span>Nigeria Tax Act 2025 Statutory Status</span>
                </div>
                <p className="text-xs text-emerald-900">
                  Small Company 0% CIT Exemption Active (Annual turnover ≤ ₦100,000,000.00 and gross fixed assets ≤ ₦250,000,000.00).
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-[#006838] border border-emerald-300">
                    0% Company Income Tax (CIT)
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-[#006838] border border-emerald-300">
                    7.5% Standard VAT Schedule
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-[#006838] border border-emerald-300">
                    2024 WHT Deduction at Source
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#E5E5EA] bg-white p-3.5 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-[#5E5E64]">Accounting Framework</span>
                  <p className="font-bold text-[#1C1C1E]">IFRS for Small &amp; Medium Entities</p>
                  <p className="text-[11px] text-[#5E5E64]">Financial Reporting Council of Nigeria (FRCN) Accredited</p>
                </div>
                <div className="rounded-xl border border-[#E5E5EA] bg-white p-3.5 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-[#5E5E64]">Statutory Fiscal Period</span>
                  <p className="font-bold text-[#1C1C1E]">Calendar Year (1 Jan – 31 Dec)</p>
                  <p className="text-[11px] text-[#5E5E64]">Current Active Year: FY2026</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "files" && (
            <div className="space-y-3">
              <p className="text-xs text-[#5E5E64]">
                Direct file operations matching desktop taskbar workflows — backup, export, or audit your accounting records:
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={handleExportBackupJson}
                  className="nb-crisp-pill-lift flex items-center justify-between rounded-2xl border border-[#D1D1D6] bg-white p-3.5 text-left transition hover:border-[#006838] hover:bg-[#FAFAFC]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#006838]">
                      <Save className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1C1C1E]">Export Complete Company File Backup (.json)</p>
                      <p className="text-[11px] text-[#5E5E64]">Standalone machine-readable JSON backup with SHA-256 seal</p>
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-[#5E5E64]" />
                </button>

                <Link
                  href="/reports"
                  onClick={onClose}
                  className="nb-crisp-pill-lift flex items-center justify-between rounded-2xl border border-[#D1D1D6] bg-white p-3.5 text-left transition hover:border-[#006838] hover:bg-[#FAFAFC]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#0F4C81]">
                      <FileSpreadsheet className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1C1C1E]">Export Financial Statement Workbook (.xlsx)</p>
                      <p className="text-[11px] text-[#5E5E64]">Multi-sheet official Excel package (P&amp;L, Balance Sheet, Trial Balance)</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-[#5E5E64]" />
                </Link>

                <Link
                  href="/security"
                  onClick={onClose}
                  className="nb-crisp-pill-lift flex items-center justify-between rounded-2xl border border-[#D1D1D6] bg-white p-3.5 text-left transition hover:border-[#006838] hover:bg-[#FAFAFC]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-[#6B21A8]">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1C1C1E]">CAMA 2020 Statutory Audit &amp; Hash Trail</p>
                      <p className="text-[11px] text-[#5E5E64]">Section 405 cryptographic verification &amp; 6-year retention archive</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-[#5E5E64]" />
                </Link>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="space-y-4">
              {/* Nigerian Cultural Artwork Theme Selector */}
              <div className="rounded-2xl border border-[#006838]/20 bg-white p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E6F5ED] text-[#006838]">
                      <Palette className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1C1C1E]">Nigerian Cultural Artwork Theme</p>
                      <p className="text-[11px] text-[#5E5E64]">Authentic heritage textile &amp; bronze watermark on app background</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#E6F5ED] px-2.5 py-0.5 text-[10px] font-bold text-[#006838]">
                    Live Canvas
                  </span>
                </div>

                {/* Motif Cards */}
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {ART_MOTIFS.map((motif) => {
                    const isSelected = artTheme.motif === motif.id;
                    return (
                      <button
                        key={motif.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleArtMotifChange(motif.id)}
                        className={`nb-crisp-card-lift text-left rounded-xl p-3 border transition flex flex-col justify-between ${
                          isSelected
                            ? "border-[#006838] bg-[#F4FBF7] ring-2 ring-[#006838]/30"
                            : "border-[#E5E5EA] bg-[#FAFAFC] hover:border-[#D1D1D6] hover:bg-white"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[#1C1C1E]">{motif.name}</span>
                            {isSelected && (
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#006838] text-white">
                                <Check className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </div>
                          <span className="block text-[10px] font-semibold text-[#006838] mt-0.5">
                            {motif.region}
                          </span>
                          <p className="text-[11px] text-[#5E5E64] mt-1.5 leading-snug">
                            {motif.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Intensity Selector */}
                <div className="pt-2 border-t border-[#E5E5EA] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="font-bold text-[11px] text-[#1C1C1E]">Artwork Watermark Density</span>
                    <p className="text-[10px] text-[#5E5E64]">Calibrated for zero eye strain &amp; maximum financial readability</p>
                  </div>
                  <div className="inline-flex rounded-full border border-[#D1D1D6] bg-[#F2F2F7] p-0.5">
                    {ART_INTENSITIES.map((intensity) => {
                      const isSelected = artTheme.intensity === intensity.id;
                      return (
                        <button
                          key={intensity.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => handleArtIntensityChange(intensity.id)}
                          className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                            isSelected
                              ? "bg-white text-[#1C1C1E] shadow-sm"
                              : "text-[#5E5E64] hover:text-[#1C1C1E]"
                          }`}
                        >
                          {intensity.id === "subtle" ? "Subtle" : intensity.id === "vibrant" ? "Vibrant" : "Minimal"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E5E5EA] bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#1C1C1E]">Default Interface Complexity</p>
                    <p className="text-[11px] text-[#5E5E64]">Simple (Plain English) vs Pro (Double-Entry Debit/Credit View)</p>
                  </div>
                  <div className="inline-flex rounded-full border border-[#D1D1D6] bg-[#F2F2F7] p-1">
                    <button
                      type="button"
                      onClick={() => setMode("simple")}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                        mode === "simple" ? "bg-white text-[#1C1C1E] shadow-sm" : "text-[#5E5E64]"
                      }`}
                    >
                      Simple
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("pro")}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                        mode === "pro" ? "bg-white text-[#1C1C1E] shadow-sm" : "text-[#5E5E64]"
                      }`}
                    >
                      Pro
                    </button>
                  </div>
                </div>

                <div className="border-t border-[#E5E5EA] pt-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#1C1C1E]">Visual Comfort &amp; Razor-Sharp Rendering</p>
                    <p className="text-[11px] text-[#5E5E64]">Hardware-composited zero-blur tile elevation active</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-[#00582E]">
                    Optimized
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E5E5EA] bg-[#FAFAFC] p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#1C1C1E]">Governance &amp; Access Controls</p>
                  <p className="text-[11px] text-[#5E5E64]">Manage user roles, two-factor authentication, and data privacy</p>
                </div>
                <Link
                  href="/security"
                  onClick={onClose}
                  className="nb-crisp-pill-lift inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-[#1C1C1E] px-4 text-xs font-semibold text-white shadow-sm hover:bg-black"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Security Hub</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E5EA] bg-[#F2F2F7] px-6 py-3.5">
          <div className="flex items-center gap-2 text-[11px] text-[#5E5E64]">
            <Award className="h-3.5 w-3.5 text-[#006838]" />
            <span>NairaBooks 2026 · Built for Nigerian Commercial Entities</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/security"
              onClick={onClose}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-4 text-xs font-semibold text-[#1C1C1E] hover:bg-[#F2F2F7]"
            >
              <span>Full Governance</span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="nb-crisp-pill-lift inline-flex min-h-[38px] items-center rounded-full bg-[#006838] px-5 text-xs font-semibold text-white shadow-sm hover:bg-[#00552D]"
            >
              <span>Done</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
