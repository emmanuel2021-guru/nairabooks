"use client";

import { useState, useTransition } from "react";
import { useWorkspaceMode } from "@/state/workspace-mode";
import type { MutationError } from "@/types/ledger";
import type {
  FlagshipPackCode,
  FlagshipPackPreset,
  PackOperationPostResult,
  PackOperationType,
  PackWorkspacePayload,
} from "@/types/packs";

interface FlagshipOperationsWorkspaceProps {
  presets: FlagshipPackPreset[];
  initialPackCode: FlagshipPackCode;
}

const PACK_DEFAULT_OPERATION: Partial<Record<FlagshipPackCode, PackOperationType>> = {
  RETAIL_ECOMMERCE: "RETAIL_POS_CASHUP",
  WHOLESALE_DISTRIBUTION: "WHOLESALE_LANDED_RECEIPT",
  MANUFACTURING_LIGHT: "MANUFACTURING_BOM_RUN",
  CONSTRUCTION_TRADES: "CONSTRUCTION_JOB_PROGRESS",
  PROFESSIONAL_SERVICES: "PROFESSIONAL_TIME_BILLING",
  NON_PROFIT: "NONPROFIT_GRANT_ACTIVITY",
};

const OPERATION_TABS: readonly { op: PackOperationType; label: string }[] = [
  { op: "RETAIL_POS_CASHUP", label: "Retail POS Cash-Up" },
  { op: "WHOLESALE_LANDED_RECEIPT", label: "Wholesale Landed Cost PO" },
  { op: "MANUFACTURING_BOM_RUN", label: "Manufacturing BOM Batch" },
  { op: "CONSTRUCTION_JOB_PROGRESS", label: "Construction Job & WHT" },
  { op: "PROFESSIONAL_TIME_BILLING", label: "Professional Services Time" },
  { op: "NONPROFIT_GRANT_ACTIVITY", label: "Non-Profit Grant Fund" },
  { op: "HOSPITALITY_FOLIO_SETTLEMENT", label: "Hotel Folio (USALI)" },
  { op: "DINER_SERVICE_SHIFT", label: "Diner & Kitchen Shift" },
];

export function FlagshipOperationsWorkspace({
  presets,
  initialPackCode,
}: FlagshipOperationsWorkspaceProps) {
  const { mode } = useWorkspaceMode();
  const [isPending, startTransition] = useTransition();

  const [activePackCode, setActivePackCode] = useState<FlagshipPackCode>(initialPackCode);
  const [activeOperation, setActiveOperation] = useState<PackOperationType>(
    PACK_DEFAULT_OPERATION[initialPackCode] ?? "RETAIL_POS_CASHUP",
  );

  // Retail POS Z-Report state
  const [retailRef, setRetailRef] = useState("POS-Z-20260602");
  const [grossSales, setGrossSales] = useState("107500.00");
  const [cashTender, setCashTender] = useState("30000.00");
  const [cardTender, setCardTender] = useState("77500.00");
  const [mdrFee, setMdrFee] = useState("1162.50");
  const [retailCogs, setRetailCogs] = useState("60000.00");
  const [vatInclusive, setVatInclusive] = useState(true);

  // Wholesale Landed Receipt state
  const [wholesaleRef, setWholesaleRef] = useState("PO-APAPA-019");
  const [unitsReceived, setUnitsReceived] = useState("100");
  const [supplierInvoice, setSupplierInvoice] = useState("500000.00");
  const [freightClearing, setFreightClearing] = useState("150000.00");
  const [sellingPriceUnit, setSellingPriceUnit] = useState("8500.00");

  // Manufacturing BOM Run state
  const [bomRef, setBomRef] = useState("BOM-BAKE-042");
  const [rawIssued, setRawIssued] = useState("400000.00");
  const [conversionCost, setConversionCost] = useState("100000.00");
  const [scrapSpoilage, setScrapSpoilage] = useState("25000.00");
  const [unitsProduced, setUnitsProduced] = useState("50");

  // Construction Job Progress state
  const [constRef, setConstRef] = useState("VAL-LEKKI-01");
  const [projectSite, setProjectSite] = useState("Lekki Phase 1 Duplex");
  const [certifiedValuation, setCertifiedValuation] = useState("2000000.00");
  const [clientRetentionPct, setClientRetentionPct] = useState("5.00");
  const [materialsIssued, setMaterialsIssued] = useState("300000.00");
  const [subcontractorClaim, setSubcontractorClaim] = useState("1000000.00");
  const [subcontractorRetentionPct, setSubcontractorRetentionPct] = useState("5.00");
  const [subcontractorWhtRate, setSubcontractorWhtRate] = useState("2.00");
  const [subcontractorHasTin, setSubcontractorHasTin] = useState(true);

  // Professional Services Time & Retainer state
  const [profRef, setProfRef] = useState("INV-ADV-2026-09");
  const [engagementCode, setEngagementCode] = useState("ENG-ZENITH-AUDIT");
  const [billableHours, setBillableHours] = useState("40.00");
  const [hourlyRate, setHourlyRate] = useState("25000.00");
  const [billedFee, setBilledFee] = useState("950000.00");
  const [retainerApplied, setRetainerApplied] = useState("200000.00");
  const [reimbursableExpense, setReimbursableExpense] = useState("50000.00");
  const [profWhtRate, setProfWhtRate] = useState("5.00");
  const [profVatApplicable, setProfVatApplicable] = useState(true);

  // Non-Profit Grant & Fund state
  const [ngoRef, setNgoRef] = useState("GRANT-MALARIA-Q2");
  const [donorFundName, setDonorFundName] = useState("Sahel Malaria Relief Fund");
  const [fundRestriction, setFundRestriction] = useState<"RESTRICTED" | "UNRESTRICTED">(
    "RESTRICTED",
  );
  const [approvedBudget, setApprovedBudget] = useState("5000000.00");
  const [trancheReceived, setTrancheReceived] = useState("3000000.00");
  const [programSpend, setProgramSpend] = useState("1800000.00");
  const [priorSpend, setPriorSpend] = useState("2500000.00");

  // Hotel USALI Folio Template state
  const [hotelRef, setHotelRef] = useState("FOLIO-IKOYI-304");
  const [propertyWing, setPropertyWing] = useState("Victoria Island Main Wing");
  const [roomsSold, setRoomsSold] = useState("12");
  const [availableRooms, setAvailableRooms] = useState("20");
  const [roomRateBase, setRoomRateBase] = useState("600000.00");
  const [hotelStateTax, setHotelStateTax] = useState(true);
  const [serviceChargeRate, setServiceChargeRate] = useState("10.00");

  // Diner Shift Template state
  const [dinerRef, setDinerRef] = useState("SHIFT-BISTRO-08");
  const [diningOutlet, setDiningOutlet] = useState("Main Grill & Lounge");
  const [coversServed, setCoversServed] = useState("85");
  const [fbSales, setFbSales] = useState("450000.00");
  const [ingredientCogs, setIngredientCogs] = useState("157500.00");
  const [kitchenSpoilage, setKitchenSpoilage] = useState("11250.00");
  const [dinerStateTax, setDinerStateTax] = useState(true);

  const [statusMessage, setStatusMessage] = useState<string>(
    `Active Flagship Pack: ${initialPackCode}. Select an operation to run and post to the IFRS ledger.`,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<PackOperationPostResult | null>(null);

  const selectedPreset = presets.find((p) => p.packCode === activePackCode) ?? presets[0];

  function handleActivateFlagship(code: FlagshipPackCode) {
    startTransition(async () => {
      setErrorMessage(null);
      const res = await fetch("/api/packs/flagships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packCode: code }),
      });
      const json = (await res.json()) as PackWorkspacePayload | MutationError;
      if (!res.ok || "__typename" in json) {
        const msg = "__typename" in json ? json.message : "Could not activate Flagship Pack.";
        setErrorMessage(msg);
        setStatusMessage(`Activation paused: ${msg}`);
        return;
      }
      setActivePackCode(code);
      const defaultOp = PACK_DEFAULT_OPERATION[code];
      if (defaultOp) {
        setActiveOperation(defaultOp);
      }
      setStatusMessage(
        `Activated ${code} with ${json.profile.coaAccounts.length} conflict-free IFRS accounts.`,
      );
    });
  }

  function buildOperationRequest(): { reference: string; payload: Record<string, unknown> } {
    switch (activeOperation) {
      case "RETAIL_POS_CASHUP":
        return {
          reference: retailRef,
          payload: {
            grossSalesNgn: grossSales,
            cashTenderNgn: cashTender,
            posCardTenderNgn: cardTender,
            posMdrFeeNgn: mdrFee,
            cogsNgn: retailCogs,
            vatInclusive,
          },
        };
      case "WHOLESALE_LANDED_RECEIPT":
        return {
          reference: wholesaleRef,
          payload: {
            unitsReceived: Number.parseInt(unitsReceived, 10) || 0,
            supplierInvoiceNgn: supplierInvoice,
            freightAndClearingNgn: freightClearing,
            sellingPricePerUnitNgn: sellingPriceUnit,
          },
        };
      case "MANUFACTURING_BOM_RUN":
        return {
          reference: bomRef,
          payload: {
            rawMaterialsIssuedNgn: rawIssued,
            directConversionCostNgn: conversionCost,
            scrapSpoilageNgn: scrapSpoilage,
            unitsProduced: Number.parseInt(unitsProduced, 10) || 0,
          },
        };
      case "CONSTRUCTION_JOB_PROGRESS":
        return {
          reference: constRef,
          payload: {
            projectSite,
            certifiedValuationNgn: certifiedValuation,
            clientRetentionPct,
            materialsIssuedNgn: materialsIssued,
            subcontractorClaimNgn: subcontractorClaim,
            subcontractorRetentionPct,
            subcontractorWhtRatePct: subcontractorWhtRate,
            subcontractorHasTin,
          },
        };
      case "PROFESSIONAL_TIME_BILLING":
        return {
          reference: profRef,
          payload: {
            engagementCode,
            billableHours,
            hourlyRateNgn: hourlyRate,
            billedFeeNgn: billedFee,
            retainerAppliedNgn: retainerApplied,
            reimbursableExpenseNgn: reimbursableExpense,
            whtRatePct: profWhtRate,
            vatApplicable: profVatApplicable,
          },
        };
      case "NONPROFIT_GRANT_ACTIVITY":
        return {
          reference: ngoRef,
          payload: {
            donorFundName,
            fundRestriction,
            approvedBudgetNgn: approvedBudget,
            trancheReceivedNgn: trancheReceived,
            programSpendNgn: programSpend,
            priorSpendNgn: priorSpend,
          },
        };
      case "HOSPITALITY_FOLIO_SETTLEMENT":
        return {
          reference: hotelRef,
          payload: {
            propertyWing,
            roomsSold: Number.parseInt(roomsSold, 10) || 0,
            availableRooms: Number.parseInt(availableRooms, 10) || 0,
            roomRateBaseNgn: roomRateBase,
            applyLagosConsumptionTax: hotelStateTax,
            serviceChargeRatePct: serviceChargeRate,
          },
        };
      case "DINER_SERVICE_SHIFT":
        return {
          reference: dinerRef,
          payload: {
            diningOutlet,
            coversServed: Number.parseInt(coversServed, 10) || 0,
            foodBeverageSalesNgn: fbSales,
            ingredientCogsNgn: ingredientCogs,
            kitchenSpoilageNgn: kitchenSpoilage,
            applyStateConsumptionTax: dinerStateTax,
          },
        };
    }
  }

  function handleRunOperation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      setErrorMessage(null);
      const { reference, payload } = buildOperationRequest();

      const res = await fetch("/api/packs/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationType: activeOperation,
          postingDate: "2026-06-15",
          reference,
          payload,
        }),
      });
      const json = (await res.json()) as PackOperationPostResult | MutationError;
      if (!res.ok || "__typename" in json) {
        const msg = "__typename" in json ? json.message : "Operation validation failed.";
        setErrorMessage(msg);
        setStatusMessage(`Operation blocked: ${msg}`);
        return;
      }
      setLastResult(json);
      setStatusMessage(json.summary);
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-3 rounded-2xl border border-borderSubtle bg-surface p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            People, Stock &amp; Flagship Pack Operations
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink">
            Six Flagship Packs &amp; Operational Workbooks
          </h1>
          <p className="mt-1 text-sm text-mutedInk">
            Run daily POS, landed wholesale, manufacturing BOM, construction job costing, advisory
            retainers, donor grants, Hotel USALI folios, and Diner shifts directly into balanced
            Nigerian IFRS journals.
          </p>
        </div>
        <div
          data-testid="flagship-op-status"
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            errorMessage
              ? "border-red-300 bg-red-50 text-red-900"
              : "border-emerald-300 bg-emerald-50 text-emerald-900"
          }`}
        >
          <span className="block text-xs font-semibold uppercase tracking-wide">
            {isPending ? "Posting to IFRS Ledger..." : "Operations Ready"}
          </span>
          <span>{errorMessage ?? statusMessage}</span>
        </div>
      </header>

      <section aria-labelledby="flagship-presets-heading" className="space-y-3">
        <h2 id="flagship-presets-heading" className="text-lg font-semibold text-ink">
          1. Six Flagship Reference Packs
        </h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {presets.map((preset) => {
            const isSelected = preset.packCode === activePackCode;
            return (
              <div
                key={preset.packCode}
                className={`flex flex-col justify-between rounded-2xl border p-4 shadow-sm ${
                  isSelected
                    ? "border-primary bg-emerald-50 text-emerald-900"
                    : "border-borderSubtle bg-surface text-ink"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">{preset.title}</h3>
                    <span className="rounded-full bg-surfaceAlt px-2.5 py-0.5 text-[11px] font-semibold text-ink">
                      {preset.phaseStatus.startsWith("ACTIVE") ? "Live Operations" : "Preset Ready"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs opacity-90">{preset.plainEnglishSummary}</p>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleActivateFlagship(preset.packCode)}
                  className={`mt-4 min-h-[44px] w-full rounded-full px-4 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? "bg-primary text-white"
                      : "border border-borderSubtle bg-surface text-ink hover:bg-surfaceAlt"
                  }`}
                >
                  {isSelected ? "Active Workspace Pack" : `Activate ${preset.title}`}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleRunOperation}
          className="space-y-5 rounded-2xl border border-borderSubtle bg-surface p-6 shadow-sm lg:col-span-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink">
              2. Flagship &amp; Template Operational Workbooks
            </h2>
            {selectedPreset && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                {selectedPreset.title}
              </span>
            )}
          </div>

          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Operational workflow selector"
          >
            {OPERATION_TABS.map((tab) => (
              <button
                key={tab.op}
                type="button"
                onClick={() => setActiveOperation(tab.op)}
                className={`min-h-[44px] rounded-full px-4 py-2 text-xs font-semibold ${
                  activeOperation === tab.op
                    ? "bg-primary text-white"
                    : "border border-borderSubtle bg-surface text-ink hover:bg-surfaceAlt"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {(activePackCode === "PROFESSIONAL_SERVICES" ||
            activeOperation === "PROFESSIONAL_TIME_BILLING") && (
            <div
              data-testid="prof-cit-notice"
              className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-900"
            >
              <strong>Nigeria Tax Act 2025 Notice:</strong> Professional &amp; Consulting Services
              are excluded from the 0% small-company CIT exemption under Section 56 (30% standard
              corporate CIT applies to incorporated practices; Business Names file PIT).
            </div>
          )}

          {activeOperation === "RETAIL_POS_CASHUP" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="retail-ref" className="block text-sm font-medium text-ink">
                  POS Z-Report Reference
                </label>
                <input
                  id="retail-ref"
                  value={retailRef}
                  onChange={(e) => setRetailRef(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="retail-gross" className="block text-sm font-medium text-ink">
                  Gross Daily Sales (₦)
                </label>
                <input
                  id="retail-gross"
                  value={grossSales}
                  onChange={(e) => setGrossSales(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="retail-cash" className="block text-sm font-medium text-ink">
                  Cash Till Collected (₦)
                </label>
                <input
                  id="retail-cash"
                  value={cashTender}
                  onChange={(e) => setCashTender(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="retail-card" className="block text-sm font-medium text-ink">
                  Paystack / Moniepoint Card POS (₦)
                </label>
                <input
                  id="retail-card"
                  value={cardTender}
                  onChange={(e) => setCardTender(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="retail-mdr" className="block text-sm font-medium text-ink">
                  Terminal MDR Fee (₦)
                </label>
                <input
                  id="retail-mdr"
                  value={mdrFee}
                  onChange={(e) => setMdrFee(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="retail-cogs" className="block text-sm font-medium text-ink">
                  SKU Inventory Cost / COGS (₦)
                </label>
                <input
                  id="retail-cogs"
                  value={retailCogs}
                  onChange={(e) => setRetailCogs(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <label
                htmlFor="retail-vat-inc"
                className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium text-ink sm:col-span-2"
              >
                <input
                  id="retail-vat-inc"
                  type="checkbox"
                  checked={vatInclusive}
                  onChange={(e) => setVatInclusive(e.target.checked)}
                  className="h-5 w-5"
                />
                <span>Prices include 7.5% NRS VAT</span>
              </label>
            </div>
          )}

          {activeOperation === "WHOLESALE_LANDED_RECEIPT" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="wh-ref" className="block text-sm font-medium text-ink">
                  Wholesale PO / Waybill Reference
                </label>
                <input
                  id="wh-ref"
                  value={wholesaleRef}
                  onChange={(e) => setWholesaleRef(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="wh-units" className="block text-sm font-medium text-ink">
                  Units Received
                </label>
                <input
                  id="wh-units"
                  type="number"
                  min={1}
                  value={unitsReceived}
                  onChange={(e) => setUnitsReceived(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="wh-sup" className="block text-sm font-medium text-ink">
                  Supplier Invoice Cost (₦)
                </label>
                <input
                  id="wh-sup"
                  value={supplierInvoice}
                  onChange={(e) => setSupplierInvoice(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="wh-freight" className="block text-sm font-medium text-ink">
                  Shipping, Port Clearing &amp; Haulage (₦)
                </label>
                <input
                  id="wh-freight"
                  value={freightClearing}
                  onChange={(e) => setFreightClearing(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="wh-sell" className="block text-sm font-medium text-ink">
                  Wholesale Selling Price Per Unit (₦)
                </label>
                <input
                  id="wh-sell"
                  value={sellingPriceUnit}
                  onChange={(e) => setSellingPriceUnit(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
            </div>
          )}

          {activeOperation === "MANUFACTURING_BOM_RUN" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="bom-ref" className="block text-sm font-medium text-ink">
                  Production Batch Reference
                </label>
                <input
                  id="bom-ref"
                  value={bomRef}
                  onChange={(e) => setBomRef(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="bom-units" className="block text-sm font-medium text-ink">
                  Finished Units Produced
                </label>
                <input
                  id="bom-units"
                  type="number"
                  min={1}
                  value={unitsProduced}
                  onChange={(e) => setUnitsProduced(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="bom-raw" className="block text-sm font-medium text-ink">
                  Raw Materials Issued (₦)
                </label>
                <input
                  id="bom-raw"
                  value={rawIssued}
                  onChange={(e) => setRawIssued(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="bom-conv" className="block text-sm font-medium text-ink">
                  Factory Power &amp; Direct Labor (₦)
                </label>
                <input
                  id="bom-conv"
                  value={conversionCost}
                  onChange={(e) => setConversionCost(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="bom-scrap" className="block text-sm font-medium text-ink">
                  Scrap / Spoilage Loss (₦)
                </label>
                <input
                  id="bom-scrap"
                  value={scrapSpoilage}
                  onChange={(e) => setScrapSpoilage(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
            </div>
          )}

          {activeOperation === "CONSTRUCTION_JOB_PROGRESS" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="const-ref" className="block text-sm font-medium text-ink">
                  Valuation Certificate Reference
                </label>
                <input
                  id="const-ref"
                  value={constRef}
                  onChange={(e) => setConstRef(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="const-site" className="block text-sm font-medium text-ink">
                  Construction Site / Project
                </label>
                <input
                  id="const-site"
                  value={projectSite}
                  onChange={(e) => setProjectSite(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="const-val" className="block text-sm font-medium text-ink">
                  Certified Client Valuation (₦)
                </label>
                <input
                  id="const-val"
                  value={certifiedValuation}
                  onChange={(e) => setCertifiedValuation(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="const-cret" className="block text-sm font-medium text-ink">
                  Client Retention (%)
                </label>
                <input
                  id="const-cret"
                  value={clientRetentionPct}
                  onChange={(e) => setClientRetentionPct(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="const-mat" className="block text-sm font-medium text-ink">
                  Site Materials Issued (₦)
                </label>
                <input
                  id="const-mat"
                  value={materialsIssued}
                  onChange={(e) => setMaterialsIssued(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="const-sub" className="block text-sm font-medium text-ink">
                  Subcontractor Progress Claim (₦)
                </label>
                <input
                  id="const-sub"
                  value={subcontractorClaim}
                  onChange={(e) => setSubcontractorClaim(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="const-sret" className="block text-sm font-medium text-ink">
                  Subcontractor Retention (%)
                </label>
                <input
                  id="const-sret"
                  value={subcontractorRetentionPct}
                  onChange={(e) => setSubcontractorRetentionPct(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="const-wht" className="block text-sm font-medium text-ink">
                  Subcontractor WHT Rate
                </label>
                <select
                  id="const-wht"
                  value={subcontractorWhtRate}
                  onChange={(e) => setSubcontractorWhtRate(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle bg-surface px-3 py-2 text-sm text-ink"
                >
                  <option value="2.00">2.00% (Resident Civil/Construction)</option>
                  <option value="5.00">5.00% (Technical / Non-Resident)</option>
                </select>
              </div>
              <label
                htmlFor="const-tin"
                className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium text-ink sm:col-span-2"
              >
                <input
                  id="const-tin"
                  type="checkbox"
                  checked={subcontractorHasTin}
                  onChange={(e) => setSubcontractorHasTin(e.target.checked)}
                  className="h-5 w-5"
                />
                <span>Subcontractor has valid TIN (unchecked applies 2x No-TIN WHT penalty)</span>
              </label>
            </div>
          )}

          {activeOperation === "PROFESSIONAL_TIME_BILLING" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="prof-ref" className="block text-sm font-medium text-ink">
                  Fee Note / Invoice Reference
                </label>
                <input
                  id="prof-ref"
                  value={profRef}
                  onChange={(e) => setProfRef(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="prof-eng" className="block text-sm font-medium text-ink">
                  Client Engagement Code
                </label>
                <input
                  id="prof-eng"
                  value={engagementCode}
                  onChange={(e) => setEngagementCode(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="prof-hrs" className="block text-sm font-medium text-ink">
                  Billable Hours
                </label>
                <input
                  id="prof-hrs"
                  value={billableHours}
                  onChange={(e) => setBillableHours(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="prof-rate" className="block text-sm font-medium text-ink">
                  Standard Hourly Rate (₦)
                </label>
                <input
                  id="prof-rate"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="prof-fee" className="block text-sm font-medium text-ink">
                  Billed Milestone / Retainer Fee (₦)
                </label>
                <input
                  id="prof-fee"
                  value={billedFee}
                  onChange={(e) => setBilledFee(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="prof-ret" className="block text-sm font-medium text-ink">
                  Client Retainer Drawdown (₦)
                </label>
                <input
                  id="prof-ret"
                  value={retainerApplied}
                  onChange={(e) => setRetainerApplied(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="prof-reimb" className="block text-sm font-medium text-ink">
                  Reimbursable Expenses (₦)
                </label>
                <input
                  id="prof-reimb"
                  value={reimbursableExpense}
                  onChange={(e) => setReimbursableExpense(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="prof-wht" className="block text-sm font-medium text-ink">
                  Client WHT Credit Rate
                </label>
                <select
                  id="prof-wht"
                  value={profWhtRate}
                  onChange={(e) => setProfWhtRate(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle bg-surface px-3 py-2 text-sm text-ink"
                >
                  <option value="5.00">5.00% (Resident Corporate Client)</option>
                  <option value="10.00">10.00% (Non-Resident / Higher Rate)</option>
                  <option value="0.00">0.00% (Small-Entity Exempt)</option>
                </select>
              </div>
              <label
                htmlFor="prof-vat"
                className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium text-ink sm:col-span-2"
              >
                <input
                  id="prof-vat"
                  type="checkbox"
                  checked={profVatApplicable}
                  onChange={(e) => setProfVatApplicable(e.target.checked)}
                  className="h-5 w-5"
                />
                <span>Apply 7.5% NRS Output VAT to advisory fee</span>
              </label>
            </div>
          )}

          {activeOperation === "NONPROFIT_GRANT_ACTIVITY" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ngo-ref" className="block text-sm font-medium text-ink">
                  Grant Activity Reference
                </label>
                <input
                  id="ngo-ref"
                  value={ngoRef}
                  onChange={(e) => setNgoRef(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="ngo-donor" className="block text-sm font-medium text-ink">
                  Donor Fund / Program Name
                </label>
                <input
                  id="ngo-donor"
                  value={donorFundName}
                  onChange={(e) => setDonorFundName(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="ngo-rest" className="block text-sm font-medium text-ink">
                  Fund Restriction Class
                </label>
                <select
                  id="ngo-rest"
                  value={fundRestriction}
                  onChange={(e) =>
                    setFundRestriction(e.target.value as "RESTRICTED" | "UNRESTRICTED")
                  }
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle bg-surface px-3 py-2 text-sm text-ink"
                >
                  <option value="RESTRICTED">Restricted Donor Grant (3200)</option>
                  <option value="UNRESTRICTED">Unrestricted Operating Fund (4045)</option>
                </select>
              </div>
              <div>
                <label htmlFor="ngo-budget" className="block text-sm font-medium text-ink">
                  Approved Grant Budget (₦)
                </label>
                <input
                  id="ngo-budget"
                  value={approvedBudget}
                  onChange={(e) => setApprovedBudget(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="ngo-tranche" className="block text-sm font-medium text-ink">
                  Donor Tranche Received (₦)
                </label>
                <input
                  id="ngo-tranche"
                  value={trancheReceived}
                  onChange={(e) => setTrancheReceived(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="ngo-spend" className="block text-sm font-medium text-ink">
                  Program Spend This Period (₦)
                </label>
                <input
                  id="ngo-spend"
                  value={programSpend}
                  onChange={(e) => setProgramSpend(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ngo-prior" className="block text-sm font-medium text-ink">
                  Prior Cumulative Program Spend (₦)
                </label>
                <input
                  id="ngo-prior"
                  value={priorSpend}
                  onChange={(e) => setPriorSpend(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
            </div>
          )}

          {activeOperation === "HOSPITALITY_FOLIO_SETTLEMENT" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="htl-ref" className="block text-sm font-medium text-ink">
                  Guest Folio Reference
                </label>
                <input
                  id="htl-ref"
                  value={hotelRef}
                  onChange={(e) => setHotelRef(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="htl-wing" className="block text-sm font-medium text-ink">
                  Property / Wing
                </label>
                <input
                  id="htl-wing"
                  value={propertyWing}
                  onChange={(e) => setPropertyWing(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="htl-sold" className="block text-sm font-medium text-ink">
                  Rooms Sold
                </label>
                <input
                  id="htl-sold"
                  type="number"
                  min={0}
                  value={roomsSold}
                  onChange={(e) => setRoomsSold(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="htl-avail" className="block text-sm font-medium text-ink">
                  Available Rooms
                </label>
                <input
                  id="htl-avail"
                  type="number"
                  min={1}
                  value={availableRooms}
                  onChange={(e) => setAvailableRooms(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="htl-base" className="block text-sm font-medium text-ink">
                  Room Accommodation Base (₦)
                </label>
                <input
                  id="htl-base"
                  value={roomRateBase}
                  onChange={(e) => setRoomRateBase(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="htl-sc" className="block text-sm font-medium text-ink">
                  Fiduciary Service Charge (%)
                </label>
                <input
                  id="htl-sc"
                  value={serviceChargeRate}
                  onChange={(e) => setServiceChargeRate(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <label
                htmlFor="htl-state"
                className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium text-ink sm:col-span-2"
              >
                <input
                  id="htl-state"
                  type="checkbox"
                  checked={hotelStateTax}
                  onChange={(e) => setHotelStateTax(e.target.checked)}
                  className="h-5 w-5"
                />
                <span>Include 5% Lagos State Hospitality Consumption Levy</span>
              </label>
            </div>
          )}

          {activeOperation === "DINER_SERVICE_SHIFT" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="din-ref" className="block text-sm font-medium text-ink">
                  Shift Z-Report Reference
                </label>
                <input
                  id="din-ref"
                  value={dinerRef}
                  onChange={(e) => setDinerRef(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="din-outlet" className="block text-sm font-medium text-ink">
                  Dining Section / Outlet
                </label>
                <input
                  id="din-outlet"
                  value={diningOutlet}
                  onChange={(e) => setDiningOutlet(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="din-covers" className="block text-sm font-medium text-ink">
                  Covers Served
                </label>
                <input
                  id="din-covers"
                  type="number"
                  min={1}
                  value={coversServed}
                  onChange={(e) => setCoversServed(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="din-sales" className="block text-sm font-medium text-ink">
                  Food &amp; Beverage Net Sales (₦)
                </label>
                <input
                  id="din-sales"
                  value={fbSales}
                  onChange={(e) => setFbSales(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="din-cogs" className="block text-sm font-medium text-ink">
                  Recipe Ingredient Cost / COGS (₦)
                </label>
                <input
                  id="din-cogs"
                  value={ingredientCogs}
                  onChange={(e) => setIngredientCogs(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="din-spoil" className="block text-sm font-medium text-ink">
                  Kitchen Spoilage &amp; Waste (₦)
                </label>
                <input
                  id="din-spoil"
                  value={kitchenSpoilage}
                  onChange={(e) => setKitchenSpoilage(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle px-3 py-2 font-mono text-sm text-ink"
                />
              </div>
              <label
                htmlFor="din-state"
                className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium text-ink sm:col-span-2"
              >
                <input
                  id="din-state"
                  type="checkbox"
                  checked={dinerStateTax}
                  onChange={(e) => setDinerStateTax(e.target.checked)}
                  className="h-5 w-5"
                />
                <span>Include 5% State Restaurant Consumption Levy</span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="min-h-[44px] rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            {isPending ? "Posting Entry..." : "Post Balanced IFRS Operation"}
          </button>
        </form>

        <section
          aria-labelledby="op-output-heading"
          className="space-y-4 rounded-2xl border border-borderSubtle bg-surface p-6 shadow-sm lg:col-span-5"
        >
          <h2 id="op-output-heading" className="text-lg font-semibold text-ink">
            Computed KPIs &amp; Posting Outcome
          </h2>

          {lastResult ? (
            <div className="space-y-3">
              <p className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
                {lastResult.summary}
              </p>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(lastResult.metrics).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-borderSubtle bg-surfaceAlt p-2.5">
                    <dt className="text-mutedInk">{k}</dt>
                    <dd className="mt-0.5 font-mono text-sm font-bold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <p className="text-sm text-mutedInk">
              Submit any Flagship Pack or Hotel/Diner workbook entry to inspect exact NGN unit
              costs, WHT, grant burn rates, RevPAR/food cost KPIs, and balanced IFRS journal lines.
            </p>
          )}

          {mode === "pro" && (
            <div className="rounded-xl border border-borderSubtle bg-surfaceAlt p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink">
                IFRS Double-Entry Posting Lines
              </h3>
              {lastResult ? (
                <ul className="mt-2 space-y-1.5 text-xs">
                  {lastResult.lines.map((line, idx) => (
                    <li
                      key={`${line.accountCode}-${idx}`}
                      className="flex items-center justify-between rounded border border-borderSubtle bg-surface px-2.5 py-1.5"
                    >
                      <span>
                        <strong className="font-mono">{line.accountCode}</strong> {line.accountName}
                      </span>
                      <span className="font-mono font-semibold text-ink">
                        {line.debitNgn !== "0.00" ? `DR ₦${line.debitNgn}` : `CR ₦${line.creditNgn}`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-mutedInk">
                  Pro debit/credit splits appear here automatically once posted.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
