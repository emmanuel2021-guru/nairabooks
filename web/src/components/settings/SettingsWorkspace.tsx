"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Award,
  Building2,
  Check,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Moon,
  Palette,
  Save,
  Scale,
  Settings,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useWorkspaceMode } from "@/state/workspace-mode";
import { useThemeMode } from "@/state/theme-mode";
import {
  ART_INTENSITIES,
  ART_MOTIFS,
  getInitialArtTheme,
  saveArtTheme,
  type NigerianArtIntensity,
  type NigerianArtMotif,
} from "@/lib/art-theme";

export function SettingsWorkspace() {
  const { mode, setMode } = useWorkspaceMode();
  const { theme, setTheme: setThemeMode } = useThemeMode();
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

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E5E5EA] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#006838] text-white text-xs font-bold">
              ₦
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1C1C1E]">
              Basic User &amp; Company Settings
            </h1>
          </div>
          <p className="text-xs text-[#5E5E64] mt-1">
            Manage your corporate profile, Tax Act 2025 defaults, file operations, and workspace preferences.
          </p>
        </div>

        <Link
          href="/security"
          className="nb-crisp-pill-lift inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#006838] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#00552D]"
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Statutory Governance &amp; Audit</span>
        </Link>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-[#00582E]"
        >
          <Check className="h-4 w-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Grid of Settings Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pillar 1: Company Profile */}
        <section
          aria-label="Company Identification"
          className="rounded-2xl border border-[#E5E5EA] bg-white p-5 shadow-sm space-y-3"
        >
          <div className="flex items-center gap-2.5 border-b border-[#E5E5EA] pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#006838]">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1C1C1E]">Company Profile</h2>
              <p className="text-[11px] text-[#5E5E64]">Registered Nigerian commercial entity info</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-[#5E5E64]">Legal Entity Name:</span>
              <span className="font-bold text-[#1C1C1E]">NairaBooks Enterprise Limited</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-[#5E5E64]">CAC Registration:</span>
              <div className="flex items-center gap-2 font-mono font-bold text-[#1C1C1E]">
                <span>RC-1849204</span>
                <button
                  type="button"
                  onClick={() => handleCopy("RC-1849204", "rc")}
                  className="text-[10px] text-[#006838] hover:underline"
                >
                  {copiedKey === "rc" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-[#5E5E64]">Tax ID (TIN):</span>
              <div className="flex items-center gap-2 font-mono font-bold text-[#1C1C1E]">
                <span>28491048-0001</span>
                <button
                  type="button"
                  onClick={() => handleCopy("28491048-0001", "tin")}
                  className="text-[10px] text-[#006838] hover:underline"
                >
                  {copiedKey === "tin" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[#5E5E64]">Base Currency:</span>
              <span className="font-mono font-bold text-[#006838]">NGN (₦)</span>
            </div>
          </div>
        </section>

        {/* Pillar 2: Statutory Standards & Tax Act 2025 */}
        <section
          aria-label="Statutory Tax & Accounting Standards"
          className="rounded-2xl border border-[#E5E5EA] bg-white p-5 shadow-sm space-y-3"
        >
          <div className="flex items-center gap-2.5 border-b border-[#E5E5EA] pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#0F4C81]">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1C1C1E]">Statutory Standards</h2>
              <p className="text-[11px] text-[#5E5E64]">IFRS &amp; Nigeria Tax Act 2025 settings</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-[#5E5E64]">Accounting Standard:</span>
              <span className="font-bold text-[#1C1C1E]">IFRS for SMEs (CAMA 2020)</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-[#5E5E64]">Tax Act 2025 Tier:</span>
              <span className="font-bold text-emerald-800">Small Co. 0% CIT Active</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-[#5E5E64]">Standard VAT Rate:</span>
              <span className="font-mono font-bold text-[#1C1C1E]">7.5%</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[#5E5E64]">Fiscal Year:</span>
              <span className="font-bold text-[#1C1C1E]">FY2026 (Open)</span>
            </div>
          </div>
        </section>

        {/* Pillar 3: Desktop File Operations */}
        <section
          aria-label="File and Data Operations"
          className="rounded-2xl border border-[#E5E5EA] bg-white p-5 shadow-sm space-y-3"
        >
          <div className="flex items-center gap-2.5 border-b border-[#E5E5EA] pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-[#6B21A8]">
              <Save className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1C1C1E]">File &amp; Data Operations</h2>
              <p className="text-[11px] text-[#5E5E64]">Desktop-style file backup and exports</p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleExportBackupJson}
              className="nb-crisp-pill-lift flex w-full items-center justify-between rounded-xl border border-[#D1D1D6] bg-white p-2.5 text-xs font-semibold text-[#1C1C1E] hover:border-[#006838]"
            >
              <span className="flex items-center gap-2">
                <Download className="h-3.5 w-3.5 text-[#006838]" />
                <span>Export Company Backup File (.json)</span>
              </span>
              <span className="text-[10px] text-[#5E5E64]">JSON</span>
            </button>

            <Link
              href="/reports"
              className="nb-crisp-pill-lift flex items-center justify-between rounded-xl border border-[#D1D1D6] bg-white p-2.5 text-xs font-semibold text-[#1C1C1E] hover:border-[#006838]"
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="h-3.5 w-3.5 text-[#0F4C81]" />
                <span>Download Financial Statement Workbook (.xlsx)</span>
              </span>
              <ExternalLink className="h-3 w-3 text-[#5E5E64]" />
            </Link>
          </div>
        </section>

        {/* Pillar 4: Workspace Preferences */}
        <section
          aria-label="Workspace Preferences"
          className="rounded-2xl border border-[#E5E5EA] bg-white p-5 shadow-sm space-y-3"
        >
          <div className="flex items-center gap-2.5 border-b border-[#E5E5EA] pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-[#C25E00]">
              <Settings className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1C1C1E]">Workspace Preferences</h2>
              <p className="text-[11px] text-[#5E5E64]">Display density &amp; interaction mode</p>
            </div>
          </div>

          <div className="space-y-3 pt-1 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#1C1C1E]">Complexity Mode</p>
                <p className="text-[11px] text-[#5E5E64]">Simple (Plain English) vs Pro (Accounting)</p>
              </div>
              <div className="inline-flex rounded-full border border-[#D1D1D6] bg-[#F2F2F7] p-1">
                <button
                  type="button"
                  onClick={() => setMode("simple")}
                  className={`rounded-full px-3 py-1 font-bold ${
                    mode === "simple" ? "bg-white text-[#1C1C1E] shadow-sm" : "text-[#5E5E64]"
                  }`}
                >
                  Simple
                </button>
                <button
                  type="button"
                  onClick={() => setMode("pro")}
                  className={`rounded-full px-3 py-1 font-bold ${
                    mode === "pro" ? "bg-white text-[#1C1C1E] shadow-sm" : "text-[#5E5E64]"
                  }`}
                >
                  Pro
                </button>
              </div>
            </div>

            <div className="border-t border-[#E5E5EA] pt-2 flex items-center justify-between">
              <div>
                <p className="font-bold text-[#1C1C1E]">Zero-Blur Text Smoothing</p>
                <p className="text-[11px] text-[#5E5E64]">Hardware-composited crisp font rendering</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-[#00582E]">
                Active
              </span>
            </div>
          </div>
        </section>

        {/* Appearance & Color Scheme (Light / Dark Mode) */}
        <section
          aria-label="Appearance and Theme Mode"
          className="rounded-2xl border border-borderSubtle bg-white dark:bg-[#1C1C1E] p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#E5E5EA] dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">Appearance &amp; Dark Mode</h2>
                <p className="text-[11px] text-[#5E5E64] dark:text-neutral-400">Switch between light paper theme and midnight dark theme</p>
              </div>
            </div>
            <span className="rounded-full bg-surfaceAlt px-3 py-1 text-[11px] font-bold text-ink uppercase">
              {theme} Mode
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              aria-pressed={theme === "light"}
              onClick={() => setThemeMode("light")}
              className={`nb-crisp-card-lift flex items-center justify-between rounded-xl p-3.5 border transition ${
                theme === "light"
                  ? "border-[#006838] bg-[#F4FBF7] ring-2 ring-[#006838]/30 font-bold"
                  : "border-[#E5E5EA] bg-[#FAFAFC] hover:border-[#D1D1D6] text-ink"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sun className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold">Light Mode</span>
              </div>
              {theme === "light" && <Check className="h-4 w-4 text-[#006838]" />}
            </button>

            <button
              type="button"
              aria-pressed={theme === "dark"}
              onClick={() => setThemeMode("dark")}
              className={`nb-crisp-card-lift flex items-center justify-between rounded-xl p-3.5 border transition ${
                theme === "dark"
                  ? "border-[#006838] bg-[#F4FBF7] dark:bg-emerald-950/40 ring-2 ring-[#006838]/30 font-bold"
                  : "border-[#E5E5EA] bg-[#FAFAFC] hover:border-[#D1D1D6] text-ink"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Moon className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-semibold">Dark Mode</span>
              </div>
              {theme === "dark" && <Check className="h-4 w-4 text-[#006838]" />}
            </button>
          </div>
        </section>

        {/* Pillar 5: Nigerian Cultural Artwork Theme */}
        <section
          aria-label="Nigerian Cultural Artwork Theme"
          className="rounded-2xl border border-[#006838]/25 bg-white p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E6F5ED] text-[#006838]">
                <Palette className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#1C1C1E]">Nigerian Cultural Artwork Theme</h2>
                <p className="text-[11px] text-[#5E5E64]">Authentic heritage textile &amp; bronze watermark across all app screens</p>
              </div>
            </div>
            <span className="rounded-full bg-[#E6F5ED] px-3 py-1 text-[11px] font-bold text-[#006838]">
              Live Canvas Active
            </span>
          </div>

          {/* Motif Selection Cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            {ART_MOTIFS.map((motif) => {
              const isSelected = artTheme.motif === motif.id;
              return (
                <button
                  key={motif.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleArtMotifChange(motif.id)}
                  className={`nb-crisp-card-lift text-left rounded-xl p-3.5 border transition flex flex-col justify-between ${
                    isSelected
                      ? "border-[#006838] bg-[#F4FBF7] ring-2 ring-[#006838]/30 shadow-sm"
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
                    <p className="text-[11px] text-[#5E5E64] mt-2 leading-snug">
                      {motif.description}
                    </p>
                  </div>
                  <p className="text-[10px] text-[#006838]/80 mt-3 pt-2 border-t border-[#E5E5EA]/70 italic">
                    {motif.culturalSymbolism}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Watermark Intensity Options */}
          <div className="pt-2 border-t border-[#E5E5EA] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div>
              <p className="font-bold text-[#1C1C1E]">Artwork Watermark Density</p>
              <p className="text-[11px] text-[#5E5E64]">Fine-tuned for zero visual fatigue and razor-sharp financial figures</p>
            </div>
            <div className="inline-flex rounded-full border border-[#D1D1D6] bg-[#F2F2F7] p-1">
              {ART_INTENSITIES.map((intensity) => {
                const isSelected = artTheme.intensity === intensity.id;
                return (
                  <button
                    key={intensity.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleArtIntensityChange(intensity.id)}
                    className={`rounded-full px-3.5 py-1 text-xs font-bold transition ${
                      isSelected
                        ? "bg-white text-[#1C1C1E] shadow-sm"
                        : "text-[#5E5E64] hover:text-[#1C1C1E]"
                    }`}
                  >
                    {intensity.label.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
