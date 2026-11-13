"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Briefcase,
  Check,
  Factory,
  FileSpreadsheet,
  Hammer,
  Heart,
  Layers,
  Search,
  Store,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  type AccountGroup,
  buildComposableAccounts,
  COMPOSABLE_MODULES,
  getIfrsGroupForAccount,
  type IfrsGroupClassification,
  SECTOR_TEMPLATES,
  type SectorTemplateOption,
  type SetupMethod,
} from "@/components/onboarding/company-wizard-data";

const ACCOUNT_FILTERS: readonly ("All" | AccountGroup)[] = [
  "All",
  "Assets",
  "Liabilities",
  "Equity",
  "Income",
  "Expenses",
];

function renderSectorIcon(key: SectorTemplateOption["iconKey"]) {
  const props = { className: "h-5 w-5", strokeWidth: 2.2, "aria-hidden": true as const };
  switch (key) {
    case "store":
      return <Store {...props} />;
    case "truck":
      return <Truck {...props} />;
    case "factory":
      return <Factory {...props} />;
    case "hammer":
      return <Hammer {...props} />;
    case "briefcase":
      return <Briefcase {...props} />;
    case "heart":
      return <Heart {...props} />;
  }
}

export function CompanyWizardStepOne({
  setupMethod,
  onSetupMethodChange,
  selectedSector,
  onSelectSector,
  selectedModules,
  onToggleModule,
  showGlCodes,
  onToggleGlCodes,
}: {
  readonly setupMethod: SetupMethod;
  readonly onSetupMethodChange: (method: SetupMethod) => void;
  readonly selectedSector: string;
  readonly onSelectSector: (sectorCode: string) => void;
  readonly selectedModules: readonly string[];
  readonly onToggleModule: (moduleId: string) => void;
  readonly showGlCodes: boolean;
  readonly onToggleGlCodes: (next: boolean) => void;
}) {
  const prefersReduced = useReducedMotion();
  const [groupFilter, setGroupFilter] = useState<"All" | AccountGroup>("All");
  const [accountQuery, setAccountQuery] = useState("");

  const activeTemplate =
    SECTOR_TEMPLATES.find((s) => s.code === selectedSector) ?? SECTOR_TEMPLATES[0];

  const chosenComposableModules = COMPOSABLE_MODULES.filter((m) =>
    selectedModules.includes(m.id),
  );

  const previewAccounts =
    setupMethod === "CUSTOM_COMPOSABLE" && chosenComposableModules.length > 0
      ? buildComposableAccounts(activeTemplate.accounts, chosenComposableModules)
      : activeTemplate.accounts;

  const filteredAccounts = previewAccounts.filter((acc) => {
    if (groupFilter !== "All" && acc.group !== groupFilter) {
      return false;
    }
    const q = accountQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      acc.code.toLowerCase().includes(q) ||
      acc.simpleName.toLowerCase().includes(q) ||
      acc.accountName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Badge variant="emerald">Step 1 of 4 · Business Setup &amp; Live Chart Preview</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[#1C1C1E] sm:text-4xl">
          What kind of business do you run?
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-[#5E5E64] sm:text-base">
          Choose how you want to set up your company. Watch your full Nigerian IFRS
          Chart of Accounts update live on the right before you continue.
        </p>
      </div>

      {/* Intuitive company setup method — 3-way segmented control */}
      <div className="flex justify-center">
        <div
          role="group"
          aria-label="Company setup method"
          className="inline-flex flex-wrap justify-center gap-1 rounded-[16px] bg-[#E5E5EA]/90 p-1.5"
        >
          {[
            { id: "INDUSTRY_TEMPLATE" as const, label: "Industry Setup (Recommended)" },
            { id: "CUSTOM_COMPOSABLE" as const, label: "Mix & Match Packs" },
            { id: "CUSTOM_IMPORT" as const, label: "Custom / Accountant Import" },
          ].map((option) => {
            const active = setupMethod === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  onSetupMethodChange(option.id);
                  if (option.id === "CUSTOM_COMPOSABLE") {
                    onSelectSector("CUSTOM_COMPOSABLE");
                  } else if (selectedSector === "CUSTOM_COMPOSABLE") {
                    onSelectSector("CONSTRUCTION_CONTRACTING");
                  }
                }}
                className={`relative min-h-[40px] rounded-[12px] px-4 py-1.5 text-xs font-semibold transition-colors ${
                  active ? "text-[#1C1C1E]" : "text-[#5E5E64] hover:text-[#1C1C1E]"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="wizard-setup-method-pill"
                    transition={{ type: "spring", stiffness: 360, damping: 28 }}
                    className="absolute inset-0 rounded-[12px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                  />
                )}
                <span className="relative z-10">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1.05fr] lg:items-start">
        {/* Left column: 6 sector packs + Composable / Import controls */}
        <div className="space-y-4">
          <div
            className="grid gap-3.5 sm:grid-cols-2"
            role="radiogroup"
            aria-label="Business sector templates"
          >
            {SECTOR_TEMPLATES.map((sector) => {
              const isSelected =
                setupMethod !== "CUSTOM_COMPOSABLE" &&
                selectedSector === sector.code;
              return (
                <motion.button
                  key={sector.code}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  whileHover={prefersReduced ? undefined : { y: -3 }}
                  whileTap={prefersReduced ? undefined : { scale: 0.98 }}
                  onClick={() => {
                    onSetupMethodChange("INDUSTRY_TEMPLATE");
                    onSelectSector(sector.code);
                  }}
                  className={`relative flex flex-col items-start rounded-[20px] border p-4 text-left transition ${
                    isSelected
                      ? "border-2 border-[#006838] bg-[#E6F5ED]/65 shadow-[0_8px_22px_rgba(0,104,56,0.10)]"
                      : "border-[#E5E5EA] bg-white hover:border-[#AEAEB2]"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-[12px] ${
                        isSelected
                          ? "bg-[#006838] text-white"
                          : "bg-[#F2F2F7] text-[#1C1C1E]"
                      }`}
                    >
                      {renderSectorIcon(sector.iconKey)}
                    </span>
                    {isSelected && (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#006838] text-white">
                        <Check className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <span className="mt-3 text-sm font-bold tracking-tight text-[#1C1C1E]">
                    {sector.title}
                  </span>
                  <span className="mt-0.5 text-xs text-[#5E5E64]">
                    {sector.subtitle}
                  </span>
                  <span className="mt-2 font-mono text-[11px] font-medium text-[#006838]">
                    {sector.sampleCity}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                onSetupMethodChange("CUSTOM_COMPOSABLE");
                onSelectSector("CUSTOM_COMPOSABLE");
              }}
              className={`min-h-[44px] rounded-full px-4 py-2 text-xs font-semibold transition ${
                setupMethod === "CUSTOM_COMPOSABLE" || selectedSector === "CUSTOM_COMPOSABLE"
                  ? "bg-[#EAF3FC] text-[#0F4C81] underline"
                  : "text-[#0F4C81] hover:underline"
              }`}
            >
              Running more than one type? Mix and match modules (e.g. Hotel + Diner) &rarr;
            </button>
          </div>

          {setupMethod === "CUSTOM_COMPOSABLE" && (
            <Card className="border-[#BFDBFE] bg-[#EAF3FC]/45">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#0F4C81]" aria-hidden="true" />
                  <CardTitle className="text-sm text-[#1C1C1E]">
                    Combine Extra Operating Modules
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-[#5E5E64]">
                  Run a Hotel + Restaurant + Shop in one clean Nigerian ledger.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2.5 sm:grid-cols-2">
                {COMPOSABLE_MODULES.map((mod) => {
                  const enabled = selectedModules.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      aria-pressed={enabled}
                      onClick={() => onToggleModule(mod.id)}
                      className={`flex min-h-[56px] items-start justify-between gap-2 rounded-[14px] border p-3 text-left text-xs transition ${
                        enabled
                          ? "border-[#0F4C81] bg-white font-semibold text-[#1C1C1E] shadow-sm"
                          : "border-[#E5E5EA] bg-white/75 text-[#5E5E64]"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-[#1C1C1E]">{mod.label}</p>
                        <p className="mt-0.5 text-[11px] font-normal text-[#5E5E64]">
                          {mod.subtitle}
                        </p>
                      </div>
                      <span
                        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          enabled ? "bg-[#0F4C81] text-white" : "bg-[#E5E5EA] text-transparent"
                        }`}
                      >
                        <Check className="h-3 w-3" strokeWidth={2.6} aria-hidden="true" />
                      </span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {setupMethod === "CUSTOM_IMPORT" && (
            <Card className="bg-white">
              <CardContent className="flex items-start gap-3 p-4">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#E6F5ED] text-[#006838]">
                  <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-[#1C1C1E]">
                    Bringing accounts from another software or Excel?
                  </p>
                  <p className="text-[#5E5E64]">
                    We seed all {previewAccounts.length} baseline IFRS accounts now and
                    unlock Opening Balance &amp; CSV Trial Balance upload right after Step 4.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Full Scrollable Nigerian IFRS Chart of Accounts Inspector */}
        <Card className="bg-white">
          <CardHeader className="border-b border-[#E5E5EA] pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#006838]">
                    Live Chart of Accounts
                  </p>
                  <Badge variant="emerald" className="font-mono text-[10px]">
                    {previewAccounts.length} Accounts Ready
                  </Badge>
                </div>
                <CardTitle className="mt-1 text-base font-bold text-[#1C1C1E]">
                  {setupMethod === "CUSTOM_COMPOSABLE"
                    ? "Composable Hybrid Ledger"
                    : activeTemplate.title}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="wizard-gl-toggle"
                  className="text-xs font-semibold text-[#5E5E64]"
                >
                  GL Codes
                </label>
                <Switch
                  id="wizard-gl-toggle"
                  checked={showGlCodes}
                  onCheckedChange={onToggleGlCodes}
                  aria-label="Toggle accountant GL codes in Chart of Accounts preview"
                />
              </div>
            </div>
            <CardDescription className="text-xs text-[#5E5E64]">
              Complete Assets, Liabilities, Taxes, Equity, Income &amp; Expenses — editable anytime.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 pt-4">
            <div className="flex flex-wrap gap-1.5">
              {activeTemplate.enabledBooks.map((book) => (
                <Badge key={book} variant="outline" className="bg-[#F2F2F7] text-[11px] text-[#1C1C1E]">
                  {book}
                </Badge>
              ))}
            </div>

            {/* Category filter pills + quick filter box */}
            <div className="space-y-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5E5E64]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={accountQuery}
                  onChange={(e) => setAccountQuery(e.target.value)}
                  placeholder="Search GL code or account (e.g. VAT, Diesel, 1110)..."
                  aria-label="Search preview GL accounts"
                  className="min-h-[38px] w-full rounded-[10px] border border-[#E5E5EA] bg-[#F8F8FA] pl-8 pr-3 text-xs text-[#1C1C1E] placeholder:text-[#5E5E64]"
                />
              </div>

              <div className="flex flex-wrap gap-1" role="group" aria-label="Filter accounts by category">
                {ACCOUNT_FILTERS.map((cat) => {
                  const active = groupFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setGroupFilter(cat)}
                      className={`min-h-[30px] rounded-full px-2.5 text-[11px] font-semibold transition ${
                        active
                          ? "bg-[#1C1C1E] text-white"
                          : "bg-[#F2F2F7] text-[#5E5E64] hover:text-[#1C1C1E]"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="max-h-[360px] overflow-y-auto rounded-[16px] border border-[#E5E5EA] bg-[#F8F8FA]">
              <div aria-label="Preview chart of accounts" className="divide-y divide-[#E5E5EA]">
                {Array.from(
                  filteredAccounts.reduce<
                    Map<string, { meta: IfrsGroupClassification; items: typeof filteredAccounts }>
                  >((accMap, acc) => {
                    const meta = getIfrsGroupForAccount(acc);
                    const existing = accMap.get(meta.groupCode);
                    if (existing) {
                      existing.items = [...existing.items, acc];
                    } else {
                      accMap.set(meta.groupCode, { meta, items: [acc] });
                    }
                    return accMap;
                  }, new Map()).values(),
                ).map(({ meta, items }) => (
                  <div key={meta.groupCode} className="bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F2F2F7]/80 px-3.5 py-2 text-[11px]">
                      <span className="font-bold text-[#1C1C1E]">
                        {showGlCodes ? `${meta.groupCode} · ` : ""}
                        {meta.groupName}
                      </span>
                      <span className="font-mono text-[10px] font-semibold text-[#00582E]">
                        {meta.ifrsSection} · {meta.ifrsStandard}
                      </span>
                    </div>
                    <ul className="divide-y divide-[#E5E5EA]/70 border-t border-[#E5E5EA]">
                      {items.map((acc) => (
                        <li
                          key={acc.code}
                          className="flex items-center justify-between gap-3 border-l-2 border-l-[#006838]/30 py-2 pl-6 pr-3.5 text-xs hover:bg-[#FAFAFC]"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#1C1C1E]">
                              {showGlCodes ? `${acc.code} · ${acc.accountName}` : acc.simpleName}
                            </p>
                            <p className="truncate text-[11px] text-[#5E5E64]">
                              {showGlCodes ? acc.simpleName : `Individual · ${acc.accountName}`}
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0 bg-white font-mono text-[10px] text-[#006838]">
                            {acc.code}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
