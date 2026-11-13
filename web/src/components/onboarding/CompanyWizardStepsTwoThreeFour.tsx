"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Building2,
  CalendarDays,
  Check,
  Edit3,
  Lock,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type AccountingMethod,
  COMPOSABLE_MODULES,
  FISCAL_MONTHS,
  getShortMonthSequence,
  getTaxActSummary,
  LEGAL_STRUCTURES,
  NIGERIAN_STATES,
  type PeriodStructure,
  type PostingMethod,
  SECTOR_TEMPLATES,
  type SetupMethod,
  type TurnoverBand,
} from "@/components/onboarding/company-wizard-data";

export interface WizardFormState {
  setupMethod: SetupMethod;
  businessType: string;
  customModules: string[];
  legalStructure: string;
  workspaceName: string;
  rcNumber: string;
  tinNumber: string;
  state: string;
  address: string;
  fullName: string;
  email: string;
  password: string;
  accountingMethod: AccountingMethod;
  postingMethod: PostingMethod;
  periodStructure: PeriodStructure;
  fiscalStartMonth: string;
  fiscalYear: number;
  turnoverBand: TurnoverBand;
}

export function CompanyWizardStepTwo({
  state,
  onChange,
  onFillDemo,
}: {
  readonly state: WizardFormState;
  readonly onChange: <K extends keyof WizardFormState>(field: K, value: WizardFormState[K]) => void;
  readonly onFillDemo: () => void;
}) {
  const passwordScore =
    (state.password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(state.password) ? 1 : 0) +
    (/[0-9]/.test(state.password) ? 1 : 0) +
    (state.password.length >= 12 ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Badge variant="emerald">Step 2 of 4 · Company Identity &amp; Owner Lock</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[#1C1C1E] sm:text-4xl">
          Tell us about your company and owner login.
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-[#5E5E64] sm:text-base">
          Built around Nigerian business records — no irrelevant foreign forms.
          You can update addresses or RC/TIN details anytime later.
        </p>
      </div>

      <div className="flex justify-center">
        <Button type="button" variant="outline" size="sm" onClick={onFillDemo} className="rounded-full">
          <Sparkles className="h-3.5 w-3.5 text-[#006838]" aria-hidden="true" />
          Fill Sample Lagos Company
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Card A: Nigerian Company Details */}
        <Card className="bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#E6F5ED] text-[#006838]">
                <Building2 className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <CardTitle className="text-base text-[#1C1C1E]">Company Identity</CardTitle>
                <CardDescription className="text-xs text-[#5E5E64]">
                  Used on customer invoices, WHT schedules, and financial packs.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <span className="block text-xs font-semibold text-[#1C1C1E]">
                Business Registration Type
              </span>
              <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Business legal structure">
                {LEGAL_STRUCTURES.map((item) => {
                  const selected = state.legalStructure === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onChange("legalStructure", item.id)}
                      className={`min-h-[42px] rounded-[12px] border px-3 py-2 text-left text-xs font-semibold transition ${
                        selected
                          ? "border-[#006838] bg-[#E6F5ED]/65 text-[#00582E]"
                          : "border-[#E5E5EA] bg-[#F8F8FA] text-[#5E5E64] hover:text-[#1C1C1E]"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="signup-company" className="block text-xs font-semibold text-[#1C1C1E]">
                Company Legal Name <span className="text-[#B91C1C]">*</span>
              </label>
              <input
                id="signup-company"
                type="text"
                value={state.workspaceName}
                onChange={(e) => onChange("workspaceName", e.target.value)}
                placeholder="Ibadan Fresh Mart Ltd"
                className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3.5 text-sm text-[#1C1C1E]"
                required
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="signup-rc" className="block text-xs font-semibold text-[#1C1C1E]">
                  CAC RC / BN Number (Optional)
                </label>
                <input
                  id="signup-rc"
                  type="text"
                  value={state.rcNumber}
                  onChange={(e) => onChange("rcNumber", e.target.value)}
                  placeholder="RC 3104821"
                  className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3.5 font-mono text-sm text-[#1C1C1E]"
                />
              </div>

              <div>
                <label htmlFor="signup-tin" className="block text-xs font-semibold text-[#1C1C1E]">
                  NRS / FIRS TIN (Optional)
                </label>
                <input
                  id="signup-tin"
                  type="text"
                  value={state.tinNumber}
                  onChange={(e) => onChange("tinNumber", e.target.value)}
                  placeholder="24108291-0001"
                  className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3.5 font-mono text-sm text-[#1C1C1E]"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
              <div>
                <label htmlFor="signup-state" className="block text-xs font-semibold text-[#1C1C1E]">
                  State
                </label>
                <select
                  id="signup-state"
                  value={state.state}
                  onChange={(e) => onChange("state", e.target.value)}
                  className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3 text-sm text-[#1C1C1E]"
                >
                  {NIGERIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="signup-address" className="block text-xs font-semibold text-[#1C1C1E]">
                  Office / Shop Address (Optional)
                </label>
                <input
                  id="signup-address"
                  type="text"
                  value={state.address}
                  onChange={(e) => onChange("address", e.target.value)}
                  placeholder="14 Admiralty Way, Lekki Phase 1"
                  className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3.5 text-sm text-[#1C1C1E]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card B: Owner & Security Account */}
        <Card className="bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#EAF3FC] text-[#0F4C81]">
                <UserCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <CardTitle className="text-base text-[#1C1C1E]">
                  Your Owner Account
                </CardTitle>
                <CardDescription className="text-xs text-[#5E5E64]">
                  You get full Managing Director access and can invite bookkeepers or auditors later.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <label htmlFor="signup-fullname" className="block text-xs font-semibold text-[#1C1C1E]">
                Owner / Founder Full Name <span className="text-[#B91C1C]">*</span>
              </label>
              <input
                id="signup-fullname"
                type="text"
                value={state.fullName}
                onChange={(e) => onChange("fullName", e.target.value)}
                placeholder="Kemi Adeyemi"
                className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3.5 text-sm text-[#1C1C1E]"
                required
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-xs font-semibold text-[#1C1C1E]">
                Work Email <span className="text-[#B91C1C]">*</span>
              </label>
              <input
                id="signup-email"
                type="email"
                value={state.email}
                onChange={(e) => onChange("email", e.target.value)}
                placeholder="kemi@ibadanmart.ng"
                className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3.5 text-sm text-[#1C1C1E]"
                required
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-xs font-semibold text-[#1C1C1E]">
                Create Password (minimum 8 characters) <span className="text-[#B91C1C]">*</span>
              </label>
              <input
                id="signup-password"
                type="password"
                minLength={8}
                value={state.password}
                onChange={(e) => onChange("password", e.target.value)}
                placeholder="At least 8 characters"
                className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3.5 text-sm text-[#1C1C1E]"
                required
              />
              <div className="mt-2 flex items-center gap-1.5" aria-hidden="true">
                {[1, 2, 3, 4].map((bar) => (
                  <span
                    key={bar}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      passwordScore >= bar ? "bg-[#006838]" : "bg-[#E5E5EA]"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-[16px] border border-[#E5E5EA] bg-[#F8F8FA] p-3.5 text-xs text-[#5E5E64]">
              <div className="flex items-center gap-2 font-semibold text-[#1C1C1E]">
                <ShieldCheck className="h-4 w-4 text-[#006838]" aria-hidden="true" />
                <span>CAMA 2020 Audit Trail Enabled Automatically</span>
              </div>
              <p className="mt-1 leading-relaxed">
                Every journal and approval carries cryptographic tamper-proofing so
                bankers and external auditors trust your figures immediately.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CompanyWizardStepThree({
  state,
  onChange,
}: {
  readonly state: WizardFormState;
  readonly onChange: <K extends keyof WizardFormState>(field: K, value: WizardFormState[K]) => void;
}) {
  const monthPreview = getShortMonthSequence(state.fiscalStartMonth);
  const taxProfile = getTaxActSummary(state.turnoverBand, state.businessType);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Badge variant="emerald">Step 3 of 4 · Accounting Rules, Calendar &amp; Tax Act 2025</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[#1C1C1E] sm:text-4xl">
          Set how your books record money and year-end dates.
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-[#5E5E64] sm:text-base">
          All four core accounting setup rules in one calm place, plus automatic
          Nigeria Tax Act 2025 classification.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Accounting Method + Posting Method */}
        <Card className="bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-[#1C1C1E]">
              1. When Sales &amp; Approvals Count
            </CardTitle>
            <CardDescription className="text-xs text-[#5E5E64]">
              Choose standard IFRS Accrual or Cash basis, and whether staff posts need approval first.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#1C1C1E]">Accounting Method</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#784507]">
                  <Lock className="h-3 w-3" aria-hidden="true" />
                  Locks after first entry
                </span>
              </div>
              <div className="mt-2 grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Accounting method">
                {[
                  {
                    id: "ACCRUAL" as const,
                    title: "Accrual (Most Choose This)",
                    desc: "Counts sales & bills when issued, even before payment clears.",
                  },
                  {
                    id: "CASH" as const,
                    title: "Cash Basis",
                    desc: "Counts money only when it actually arrives or leaves your bank.",
                  },
                ].map((opt) => {
                  const selected = state.accountingMethod === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onChange("accountingMethod", opt.id)}
                      className={`rounded-[16px] border p-3.5 text-left transition ${
                        selected
                          ? "border-2 border-[#006838] bg-[#E6F5ED]/60"
                          : "border-[#E5E5EA] bg-[#F8F8FA] hover:border-[#AEAEB2]"
                      }`}
                    >
                      <p className="text-xs font-bold text-[#1C1C1E]">{opt.title}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#5E5E64]">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-[#1C1C1E]">
                Transaction Posting Mode
              </span>
              <div className="mt-2 grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Posting method">
                {[
                  {
                    id: "REAL_TIME" as const,
                    title: "Real-Time Posting",
                    desc: "Updates ledgers & bank balances immediately on save.",
                  },
                  {
                    id: "BATCH" as const,
                    title: "Batch Approval Review",
                    desc: "Staff save drafts; owner or CFO reviews & posts together.",
                  },
                ].map((opt) => {
                  const selected = state.postingMethod === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onChange("postingMethod", opt.id)}
                      className={`rounded-[16px] border p-3.5 text-left transition ${
                        selected
                          ? "border-2 border-[#006838] bg-[#E6F5ED]/60"
                          : "border-[#E5E5EA] bg-[#F8F8FA] hover:border-[#AEAEB2]"
                      }`}
                    >
                      <p className="text-xs font-bold text-[#1C1C1E]">{opt.title}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#5E5E64]">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fiscal Calendar & Live Tax Act 2025 Classifier */}
        <Card className="bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#006838]" aria-hidden="true" />
              <CardTitle className="text-base text-[#1C1C1E]">
                2. Fiscal Year &amp; Tax Act 2025 Status
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-[#5E5E64]">
              Define when your financial year starts and preview your statutory tax tier live.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="wizard-fiscal-month" className="block text-xs font-semibold text-[#1C1C1E]">
                  Start Month
                </label>
                <select
                  id="wizard-fiscal-month"
                  value={state.fiscalStartMonth}
                  onChange={(e) => onChange("fiscalStartMonth", e.target.value)}
                  className="mt-1.5 min-h-[42px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-2.5 text-xs font-medium text-[#1C1C1E]"
                >
                  {FISCAL_MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="wizard-fiscal-year" className="block text-xs font-semibold text-[#1C1C1E]">
                  First Year
                </label>
                <select
                  id="wizard-fiscal-year"
                  value={state.fiscalYear}
                  onChange={(e) => onChange("fiscalYear", Number(e.target.value))}
                  className="mt-1.5 min-h-[42px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-2.5 font-mono text-xs font-medium text-[#1C1C1E]"
                >
                  {[2025, 2026, 2027].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="wizard-period-structure" className="block text-xs font-semibold text-[#1C1C1E]">
                  Periods
                </label>
                <select
                  id="wizard-period-structure"
                  value={state.periodStructure}
                  onChange={(e) =>
                    onChange("periodStructure", e.target.value as PeriodStructure)
                  }
                  className="mt-1.5 min-h-[42px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-2.5 text-xs font-medium text-[#1C1C1E]"
                >
                  <option value="MONTHLY_12">12 Monthly Periods</option>
                  <option value="QUARTERLY_13">Quarterly + 13th Audit</option>
                </select>
              </div>
            </div>

            <div className="rounded-[14px] border border-[#E5E5EA] bg-[#F8F8FA] p-3">
              <p className="text-[11px] font-semibold text-[#5E5E64]">
                Live Period Timeline ({state.fiscalYear})
              </p>
              <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
                {monthPreview.map((abbr, index) => (
                  <div
                    key={`${abbr}-${index}`}
                    className="rounded-[8px] border border-[#E5E5EA] bg-white px-1 py-1.5 text-center"
                  >
                    <p className="font-mono text-[9px] text-[#5E5E64]">P{index + 1}</p>
                    <p className="text-[10px] font-bold text-[#1C1C1E]">{abbr}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-[#1C1C1E]">
                Expected Annual Turnover (Nigeria Tax Act 2025)
              </span>
              <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Expected annual turnover">
                {[
                  { id: "UNDER_25M" as const, label: "Under ₦25M" },
                  { id: "BETWEEN_25M_100M" as const, label: "₦25M – ₦100M" },
                  { id: "OVER_100M" as const, label: "Over ₦100M" },
                ].map((band) => {
                  const selected = state.turnoverBand === band.id;
                  return (
                    <button
                      key={band.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onChange("turnoverBand", band.id)}
                      className={`min-h-[40px] rounded-[12px] border px-2 text-xs font-semibold transition ${
                        selected
                          ? "border-[#006838] bg-[#E6F5ED] text-[#00582E]"
                          : "border-[#E5E5EA] bg-white text-[#5E5E64] hover:text-[#1C1C1E]"
                      }`}
                    >
                      {band.label}
                    </button>
                  );
                })}
              </div>

              <motion.div
                key={`${state.turnoverBand}-${state.businessType}`}
                initial={false}
                animate={{ scale: 1 }}
                className="mt-3 rounded-[16px] border border-[#006838]/25 bg-[#E6F5ED]/60 p-3.5 text-xs"
              >
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="emerald">{taxProfile.citLabel}</Badge>
                  <Badge variant="iosBlue">{taxProfile.vatLabel}</Badge>
                  <Badge variant="outline" className="bg-white text-[#1C1C1E]">
                    {taxProfile.devLevyLabel}
                  </Badge>
                </div>
                <p className="mt-2 leading-relaxed text-[#1C1C1E]">{taxProfile.note}</p>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CompanyWizardStepFour({
  state,
  onJumpToStep,
}: {
  readonly state: WizardFormState;
  readonly onJumpToStep: (step: 1 | 2 | 3) => void;
}) {
  const sectorLabel =
    state.businessType === "CUSTOM_COMPOSABLE"
      ? `Composable Pack (${
          COMPOSABLE_MODULES.filter((m) => state.customModules.includes(m.id))
            .map((m) => m.label)
            .join(", ") || "Custom Modules"
        })`
      : (SECTOR_TEMPLATES.find((s) => s.code === state.businessType)?.title ?? state.businessType);

  const taxProfile = getTaxActSummary(state.turnoverBand, state.businessType);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Badge variant="emerald">Step 4 of 4 · Ready to Create Your Company</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[#1C1C1E] sm:text-4xl">
          Everything is lined up. Ready to launch {state.workspaceName || "your company"}?
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-[#5E5E64] sm:text-base">
          Review your setup below or tap Edit on any card. Launching creates your
          isolated ledger, signs you in as Managing Director, and logs an
          immutable CAMA genesis event.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-white">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-[#1C1C1E]">
              Industry &amp; Chart Setup
            </CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => onJumpToStep(1)}>
              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs text-[#5E5E64]">
            <p className="font-semibold text-[#1C1C1E]">{sectorLabel}</p>
            <p>Nigerian IFRS Double-Entry Chart + VAT/WHT buckets ready</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-[#1C1C1E]">
              Company &amp; Owner
            </CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => onJumpToStep(2)}>
              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-[#5E5E64]">
            <p className="font-semibold text-[#1C1C1E]">
              {state.workspaceName || "Pending Name"} · {state.state}
            </p>
            <p>
              Owner: {state.fullName || "Pending"} ({state.email || "Pending"})
            </p>
            <p className="font-mono">
              RC: {state.rcNumber || "Pending"} · TIN: {state.tinNumber || "Add later"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-[#1C1C1E]">
              Accounting &amp; Approval Mode
            </CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => onJumpToStep(3)}>
              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-[#5E5E64]">
            <p className="font-semibold text-[#1C1C1E]">
              {state.accountingMethod === "ACCRUAL" ? "Accrual (IFRS)" : "Cash Basis"} ·{" "}
              {state.postingMethod === "REAL_TIME" ? "Real-Time Posting" : "Batch Approval Review"}
            </p>
            <p>Base currency locked to Nigerian Naira (₦ NGN)</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-[#1C1C1E]">
              Fiscal Calendar &amp; Tax Profile
            </CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => onJumpToStep(3)}>
              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs text-[#5E5E64]">
            <p className="font-semibold text-[#1C1C1E]">
              Starts {state.fiscalStartMonth} {state.fiscalYear} (
              {state.periodStructure === "MONTHLY_12" ? "12 Monthly Periods" : "Quarterly + Audit"})
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="emerald">{taxProfile.citLabel}</Badge>
              <Badge variant="outline" className="bg-[#F2F2F7] text-[#1C1C1E]">
                {taxProfile.vatLabel}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#006838]/25 bg-[#E6F5ED]/45">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#006838] text-white">
              <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            </span>
            <div className="text-xs">
              <p className="font-bold text-[#1C1C1E]">
                First-day Setup Guide included inside Overview
              </p>
              <p className="text-[#5E5E64]">
                Add your first customer, import a Zenith/GTBank PDF, or adjust opening balances right after launch.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
