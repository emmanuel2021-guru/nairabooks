"use client";

import { useState, useTransition } from "react";
import { useWorkspaceMode } from "@/state/workspace-mode";
import type { MutationError } from "@/types/ledger";
import type {
  MultiLayerIndirectTaxBreakdown,
  NigerianLegalForm,
  TaxProfilePayload,
  TaxRegimeType,
  TransactionDirection,
} from "@/types/tax";

const INITIAL_BREAKDOWN: MultiLayerIndirectTaxBreakdown = {
  effectiveDate: "2026-05-01",
  jurisdiction: "LAGOS",
  baseAmountNgn: "100000.00",
  vatAmountNgn: "7500.00",
  stateConsumptionTaxNgn: "5000.00",
  serviceChargeNgn: "10000.00",
  whtDeductionNgn: "5000.00",
  grossCustomerInvoiceNgn: "122500.00",
  netCashPayableNgn: "117500.00",
  vatNrsCategoryCode: "S",
  whtHigherNoTinApplied: false,
  whtExemptSmallEntityApplied: false,
  accountPostings: [
    {
      accountCode: "2110",
      accountName: "Output VAT Payable (7.5%)",
      side: "CREDIT",
      taxSchemeId: "VAT",
      amountNgn: "7500.00",
    },
    {
      accountCode: "2130",
      accountName: "LAGOS Consumption Levy Payable",
      side: "CREDIT",
      taxSchemeId: "STATE_CONSUMPTION",
      amountNgn: "5000.00",
    },
    {
      accountCode: "2140",
      accountName: "Fiduciary Staff Service Charge Payable",
      side: "CREDIT",
      taxSchemeId: "SERVICE_CHARGE",
      amountNgn: "10000.00",
    },
    {
      accountCode: "1150",
      accountName: "WHT Credit Note Receivable",
      side: "DEBIT",
      taxSchemeId: "WHT",
      amountNgn: "5000.00",
    },
  ],
  nrsSubtotals: [
    {
      taxSchemeId: "VAT",
      categoryCode: "S",
      taxableAmountNgn: "100000.00",
      taxRate: "0.075000",
      taxAmountNgn: "7500.00",
      statutoryCitation: "Value Added Tax Act Sec 4 (Standard 7.5% Rate)",
      ruleVersionCode: "NG-VAT-75-2020",
    },
    {
      taxSchemeId: "STATE_CONSUMPTION",
      categoryCode: "LAGOS",
      taxableAmountNgn: "100000.00",
      taxRate: "0.050000",
      taxAmountNgn: "5000.00",
      statutoryCitation: "Hotel Occupancy and Restaurant Consumption Law of Lagos State (5%)",
      ruleVersionCode: "NG-STATE-LAGOS-5",
    },
    {
      taxSchemeId: "SERVICE_CHARGE",
      categoryCode: "FIDUCIARY",
      taxableAmountNgn: "100000.00",
      taxRate: "0.100000",
      taxAmountNgn: "10000.00",
      statutoryCitation: "Fiduciary Hospitality Service Charge Pool (Non-Revenue Clearing)",
      ruleVersionCode: "NG-FIDUCIARY-SC",
    },
    {
      taxSchemeId: "WHT",
      categoryCode: "WHT_PROFESSIONAL_CONSULTING",
      taxableAmountNgn: "100000.00",
      taxRate: "0.050000",
      taxAmountNgn: "5000.00",
      statutoryCitation:
        "WHT Regulations 2024 First Schedule — Consultancy & Professional Fees (5% Resident)",
      ruleVersionCode: "NG-WHT-2024-PROF",
    },
  ],
};

export function TaxEngineWorkspace({
  initialData,
}: {
  readonly initialData: TaxProfilePayload;
}) {
  const { mode } = useWorkspaceMode();
  const [profileData, setProfileData] = useState<TaxProfilePayload>(initialData);

  const [legalForm, setLegalForm] = useState<NigerianLegalForm>(initialData.profile.legalForm);
  const [stateOp, setStateOp] = useState<string>(initialData.profile.stateOfOperation);
  const [tinNumber, setTinNumber] = useState<string>(initialData.profile.tinNumber ?? "");
  const [vatRegistered, setVatRegistered] = useState<boolean>(initialData.profile.vatRegistered);
  const [annualTurnover, setAnnualTurnover] = useState<string>(
    initialData.profile.annualTurnoverNgn,
  );
  const [fixedAssets, setFixedAssets] = useState<string>(initialData.profile.fixedAssetsNgn);
  const [isProfServices, setIsProfServices] = useState<boolean>(
    initialData.profile.isProfessionalServices,
  );

  const [baseAmount, setBaseAmount] = useState<string>("100000.00");
  const [vatRegime, setVatRegime] = useState<TaxRegimeType>("VAT_STANDARD_7_5");
  const [includeStateTax, setIncludeStateTax] = useState<boolean>(true);
  const [serviceChargeRate, setServiceChargeRate] = useState<string>("0.100000");
  const [whtCategory, setWhtCategory] = useState<string>("WHT_PROFESSIONAL_CONSULTING");
  const [counterpartyHasTin, setCounterpartyHasTin] = useState<boolean>(true);
  const [direction, setDirection] = useState<TransactionDirection>("SALES");

  const [breakdown, setBreakdown] = useState<MultiLayerIndirectTaxBreakdown>(INITIAL_BREAKDOWN);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { profile, evaluation } = profileData;

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/tax/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            legalForm,
            tinNumber: tinNumber.trim() || null,
            vatRegistered,
            annualTurnoverNgn: annualTurnover.trim(),
            fixedAssetsNgn: fixedAssets.trim(),
            stateOfOperation: stateOp.trim(),
            isProfessionalServices: isProfServices,
            effectiveFrom: "2026-01-01",
          }),
        });
        const body = (await res.json()) as TaxProfilePayload | MutationError;
        if (!res.ok || !("profile" in body)) {
          setErrorMsg("message" in body ? body.message : "Could not update tax profile.");
          return;
        }
        setProfileData(body);
      } catch {
        setErrorMsg("Network error while updating Nigerian tax profile.");
      }
    });
  };

  const handleCalculateIndirect = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const vatCategoryByRegime: Record<string, string> = {
      VAT_STANDARD_7_5: "STANDARD_TAXABLE_SUPPLY",
      VAT_ZERO_RATED: "ZERO_RATED_EXPORT_OR_BASIC",
      VAT_EXEMPT: "VAT_EXEMPT_SUPPLY",
    };
    startTransition(async () => {
      try {
        const res = await fetch("/api/tax/nrs-indirect-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionDate: "2026-05-01",
            baseAmountNgn: baseAmount.trim(),
            vatRegime,
            vatSupplyCategoryCode:
              vatCategoryByRegime[vatRegime] ?? "STANDARD_TAXABLE_SUPPLY",
            includeStateConsumptionTax: includeStateTax,
            serviceChargeRate,
            whtSupplyCategoryCode: whtCategory || null,
            counterpartyHasValidTin: counterpartyHasTin,
            transactionDirection: direction,
          }),
        });
        const body = (await res.json()) as MultiLayerIndirectTaxBreakdown | MutationError;
        if (!res.ok || !("nrsSubtotals" in body)) {
          setErrorMsg("message" in body ? body.message : "Could not calculate Nigerian taxes.");
          return;
        }
        setBreakdown(body);
      } catch {
        setErrorMsg("Network error while calculating Nigerian taxes.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 pb-sticky-clearance">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Nigerian Tax Rules, CIT Radar &amp; NRS Breakdown
          </h1>
          <p className="mt-1 text-sm text-mutedInk">
            {mode === "simple"
              ? "Simple Mode: Automatic Nigeria Tax Act 2025 small-business check, 7.5% VAT, state levies, and WHT without spreadsheets."
              : "Pro Mode: Effective-dated statutory tax rules, SEC-REQ-04 server-locked rates, 2024 WHT TIN penalties, and NRS e-invoice subtotals."}
          </p>
        </div>

        <div
          data-testid="tax-cit-status"
          aria-live="polite"
          role="status"
          className={
            evaluation.eligibleForZeroCit
              ? "rounded-full border border-emerald-700/30 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900"
              : "rounded-full border border-amber-700/30 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900"
          }
        >
          {evaluation.eligibleForZeroCit
            ? `0% Small-Company / Exempt CIT (${evaluation.turnoverUtilizationPct}% of ₦100M cap)`
            : `Standard CIT / Excluded (${evaluation.ruleVersionCode})`}
        </div>
      </div>

      {errorMsg ? (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
        >
          {errorMsg}
        </div>
      ) : null}

      <section
        aria-labelledby="tax-radar-heading"
        className="rounded-2xl border border-borderSubtle bg-surface p-5 shadow-sm space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="tax-radar-heading" className="text-lg font-semibold text-ink">
            Nigeria Tax Act 2025 Small-Company Threshold Radar
          </h2>
          <span className="font-mono text-xs font-semibold text-ink">
            Alert: {evaluation.thresholdAlertLevel}
          </span>
        </div>

        <p className="text-sm text-ink">{evaluation.reason}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-surfaceAlt p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-mutedInk">
              Annual Turnover vs ₦100,000,000 Cap
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-ink">
              ₦{profile.annualTurnoverNgn} ({evaluation.turnoverUtilizationPct}%)
            </p>
          </div>
          <div className="rounded-xl bg-surfaceAlt p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-mutedInk">
              Fixed Assets vs ₦250,000,000 Cap
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-ink">
              ₦{profile.fixedAssetsNgn} ({evaluation.assetUtilizationPct}%)
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="tax-profile-heading"
          className="rounded-2xl border border-borderSubtle bg-surface p-5 shadow-sm"
        >
          <h2 id="tax-profile-heading" className="text-lg font-semibold text-ink">
            Company Entity &amp; Tax Profile
          </h2>

          <form onSubmit={handleProfileSave} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="tax-legal-form" className="block text-sm font-medium text-ink">
                  Legal Form
                </label>
                <select
                  id="tax-legal-form"
                  value={legalForm}
                  onChange={(e) => setLegalForm(e.target.value as NigerianLegalForm)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-borderSubtle bg-surface px-3 py-2 text-sm text-ink"
                >
                  <option value="PRIVATE_LIMITED">Private Limited (Ltd)</option>
                  <option value="PUBLIC_LIMITED">Public Limited (PLC)</option>
                  <option value="BUSINESS_NAME">Business Name / Sole Trader</option>
                  <option value="LIMITED_LIABILITY_PARTNERSHIP">LLP</option>
                  <option value="INCORPORATED_TRUSTEE_NGO">NGO (Incorporated Trustee)</option>
                </select>
              </div>

              <div>
                <label htmlFor="tax-state" className="block text-sm font-medium text-ink">
                  State of Operation
                </label>
                <select
                  id="tax-state"
                  value={stateOp}
                  onChange={(e) => setStateOp(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-borderSubtle bg-surface px-3 py-2 text-sm text-ink"
                >
                  <option value="LAGOS">Lagos (5% Hospitality Levy)</option>
                  <option value="FCT_ABUJA">FCT Abuja</option>
                  <option value="RIVERS">Rivers</option>
                  <option value="KANO">Kano</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="tax-turnover" className="block text-sm font-medium text-ink">
                  Annual Turnover (NGN)
                </label>
                <input
                  id="tax-turnover"
                  type="text"
                  inputMode="decimal"
                  value={annualTurnover}
                  onChange={(e) => setAnnualTurnover(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-borderSubtle bg-surface px-3 py-2 font-mono text-sm text-ink"
                />
              </div>

              <div>
                <label htmlFor="tax-assets" className="block text-sm font-medium text-ink">
                  Total Fixed Assets (NGN)
                </label>
                <input
                  id="tax-assets"
                  type="text"
                  inputMode="decimal"
                  value={fixedAssets}
                  onChange={(e) => setFixedAssets(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-borderSubtle bg-surface px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
            </div>

            <div>
              <label htmlFor="tax-tin" className="block text-sm font-medium text-ink">
                FIRS / JTB TIN Number
              </label>
              <input
                id="tax-tin"
                type="text"
                value={tinNumber}
                onChange={(e) => setTinNumber(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-lg border border-borderSubtle bg-surface px-3 py-2 font-mono text-sm text-ink"
              />
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="inline-flex min-h-[44px] items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={vatRegistered}
                  onChange={(e) => setVatRegistered(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                VAT Registered
              </label>

              <label className="inline-flex min-h-[44px] items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={isProfServices}
                  onChange={(e) => setIsProfServices(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Professional Services Firm (Excl. 0% CIT)
              </label>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="min-h-[44px] rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
            >
              Update Tax Profile
            </button>
          </form>
        </section>

        <section
          aria-labelledby="tax-calc-heading"
          className="rounded-2xl border border-borderSubtle bg-surface p-5 shadow-sm"
        >
          <h2 id="tax-calc-heading" className="text-lg font-semibold text-ink">
            VAT, 2024 WHT &amp; State Levy Calculator
          </h2>

          <form onSubmit={handleCalculateIndirect} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="calc-base-amount" className="block text-sm font-medium text-ink">
                  Exclusive Supply Amount (NGN)
                </label>
                <input
                  id="calc-base-amount"
                  type="text"
                  inputMode="decimal"
                  value={baseAmount}
                  onChange={(e) => setBaseAmount(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-borderSubtle bg-surface px-3 py-2 font-mono text-sm text-ink"
                />
              </div>

              <div>
                <label htmlFor="calc-vat-regime" className="block text-sm font-medium text-ink">
                  VAT Classification
                </label>
                <select
                  id="calc-vat-regime"
                  value={vatRegime}
                  onChange={(e) => setVatRegime(e.target.value as TaxRegimeType)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-borderSubtle bg-surface px-3 py-2 text-sm text-ink"
                >
                  <option value="VAT_STANDARD_7_5">Standard 7.5% VAT (NRS S)</option>
                  <option value="VAT_ZERO_RATED">Zero-Rated 0% Export / Basic (NRS Z)</option>
                  <option value="VAT_EXEMPT">VAT Exempt (NRS E)</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="calc-wht-category" className="block text-sm font-medium text-ink">
                  2024 WHT Transaction Type
                </label>
                <select
                  id="calc-wht-category"
                  value={whtCategory}
                  onChange={(e) => setWhtCategory(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-borderSubtle bg-surface px-3 py-2 text-sm text-ink"
                >
                  <option value="">No WHT Applicable</option>
                  <option value="WHT_GOODS_SUPPLY">Supply of Goods (2%)</option>
                  <option value="WHT_CONSTRUCTION_CIVIL">Construction Works (2%)</option>
                  <option value="WHT_PROFESSIONAL_CONSULTING">
                    Consultancy / Professional Fees (5%)
                  </option>
                  <option value="WHT_RENT_OR_NON_RESIDENT">
                    Rent / Royalties / Non-Resident (10%)
                  </option>
                </select>
              </div>

              <div>
                <label htmlFor="calc-service-charge" className="block text-sm font-medium text-ink">
                  Fiduciary Service Charge Rate
                </label>
                <select
                  id="calc-service-charge"
                  value={serviceChargeRate}
                  onChange={(e) => setServiceChargeRate(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-borderSubtle bg-surface px-3 py-2 text-sm text-ink"
                >
                  <option value="0.000000">None (0%)</option>
                  <option value="0.100000">10% Hospitality Pool</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="calc-direction" className="block text-sm font-medium text-ink">
                  Transaction Direction
                </label>
                <select
                  id="calc-direction"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as TransactionDirection)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-borderSubtle bg-surface px-3 py-2 text-sm text-ink"
                >
                  <option value="SALES">Customer Invoice (Sales)</option>
                  <option value="PURCHASE">Vendor Bill (Purchase)</option>
                </select>
              </div>

              <div className="flex flex-col justify-center gap-2 pt-2">
                <label className="inline-flex min-h-[44px] items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={includeStateTax}
                    onChange={(e) => setIncludeStateTax(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Apply State Consumption Levy ({profile.stateOfOperation})
                </label>
                <label className="inline-flex min-h-[44px] items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={counterpartyHasTin}
                    onChange={(e) => setCounterpartyHasTin(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Counterparty has valid TIN
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="min-h-[44px] rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
            >
              Compute Nigerian Taxes
            </button>
          </form>
        </section>
      </div>

      <section
        aria-labelledby="tax-results-heading"
        className="rounded-2xl border border-borderSubtle bg-surface p-5 shadow-sm space-y-4"
      >
        <h2 id="tax-results-heading" className="text-lg font-semibold text-ink">
          Computed Tax Summary &amp; Ledger Splits
        </h2>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl bg-surfaceAlt p-3">
            <p className="text-xs font-semibold text-mutedInk">Base Amount</p>
            <p className="mt-1 font-mono text-base font-bold text-ink">
              ₦{breakdown.baseAmountNgn}
            </p>
          </div>
          <div className="rounded-xl bg-surfaceAlt p-3">
            <p className="text-xs font-semibold text-mutedInk">
              VAT ({breakdown.vatNrsCategoryCode})
            </p>
            <p className="mt-1 font-mono text-base font-bold text-ink">
              ₦{breakdown.vatAmountNgn}
            </p>
          </div>
          <div className="rounded-xl bg-surfaceAlt p-3">
            <p className="text-xs font-semibold text-mutedInk">State Levy</p>
            <p className="mt-1 font-mono text-base font-bold text-ink">
              ₦{breakdown.stateConsumptionTaxNgn}
            </p>
          </div>
          <div className="rounded-xl bg-surfaceAlt p-3">
            <p className="text-xs font-semibold text-mutedInk">Service Charge</p>
            <p className="mt-1 font-mono text-base font-bold text-ink">
              ₦{breakdown.serviceChargeNgn}
            </p>
          </div>
          <div className="rounded-xl bg-surfaceAlt p-3">
            <p className="text-xs font-semibold text-mutedInk">WHT Deducted</p>
            <p className="mt-1 font-mono text-base font-bold text-ink">
              ₦{breakdown.whtDeductionNgn}
            </p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-emerald-50 p-3">
            <p className="text-xs font-semibold text-emerald-900">Net Cash Settlement</p>
            <p className="mt-1 font-mono text-base font-bold text-emerald-900">
              ₦{breakdown.netCashPayableNgn}
            </p>
          </div>
        </div>

        {breakdown.whtHigherNoTinApplied ? (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            Punitive No-TIN WHT Rule Applied: Missing supplier TIN doubled the WHT rate per 2024
            WHT Regulations.
          </p>
        ) : null}

        {mode === "pro" ? (
          <div className="space-y-2 rounded-xl border border-borderSubtle bg-surfaceAlt p-4">
            <h3 className="text-sm font-semibold text-ink">
              NRS E-Invoice TaxSubtotal Payload ({breakdown.nrsSubtotals.length} layers)
            </h3>
            <pre className="overflow-x-auto font-mono text-xs text-ink">
              {JSON.stringify(
                {
                  accountPostings: breakdown.accountPostings,
                  nrsSubtotals: breakdown.nrsSubtotals,
                },
                null,
                2,
              )}
            </pre>
          </div>
        ) : null}
      </section>
    </div>
  );
}
