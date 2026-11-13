"use client";

import { useState, useTransition } from "react";
import { useWorkspaceMode } from "@/state/workspace-mode";
import type { MutationError } from "@/types/ledger";
import type {
  FlagshipPackCode,
  OperationalPrimitive,
  PackWorkspacePayload,
  WorkspaceIndustryProfile,
} from "@/types/packs";

const PACK_OPTIONS: { code: FlagshipPackCode; label: string; hint: string }[] = [
  {
    code: "CUSTOM_COMPOSABLE",
    label: "Custom / Multi-Unit Hybrid Builder",
    hint: "Mix any capabilities cleanly across divisions.",
  },
  {
    code: "RETAIL_ECOMMERCE",
    label: "Retail & E-Commerce",
    hint: "POS tills, SKU stock, card clearing.",
  },
  {
    code: "WHOLESALE_DISTRIBUTION",
    label: "Wholesale & Distribution",
    hint: "Regional warehouses, freight & landed duty.",
  },
  {
    code: "MANUFACTURING_LIGHT",
    label: "Manufacturing & Light Assembly",
    hint: "Raw materials, BOM WIP, batch yield.",
  },
  {
    code: "CONSTRUCTION_TRADES",
    label: "Construction, Contracting & Trades",
    hint: "Site job costing, retention & subcontractor WHT.",
  },
  {
    code: "PROFESSIONAL_SERVICES",
    label: "Professional & Consulting Services",
    hint: "Retainers, unbilled WIP & advisory fees.",
  },
  {
    code: "NON_PROFIT",
    label: "NGO, Foundation & Non-Profit",
    hint: "Restricted donor grants & fund tracking.",
  },
];

interface BuilderTemplatePreset {
  id: string;
  buttonLabel: string;
  description: string;
  primaryPack: FlagshipPackCode;
  isHybridMultiUnit: boolean;
  primitives: OperationalPrimitive[];
  customer: string;
  invoice: string;
  project: string;
}

const BUILDER_TEMPLATES: readonly BuilderTemplatePreset[] = [
  {
    id: "hotel-usali",
    buttonLabel: "Load Hotel / Hospitality (USALI)",
    description: "Room folios, 5% state consumption tax, 10% service charge & RevPAR.",
    primaryPack: "CUSTOM_COMPOSABLE",
    isHybridMultiUnit: false,
    primitives: ["HOSPITALITY_FOLIO_USALI"],
    customer: "Guest",
    invoice: "Guest Folio",
    project: "Property Wing",
  },
  {
    id: "diner-restaurant",
    buttonLabel: "Load Diner / Restaurant",
    description: "Table checks, kitchen recipe COGS, spoilage & state consumption tax.",
    primaryPack: "CUSTOM_COMPOSABLE",
    isHybridMultiUnit: false,
    primitives: ["DINER_RECIPE_TABLE"],
    customer: "Diner",
    invoice: "Table Check",
    project: "Dining Outlet",
  },
  {
    id: "hybrid-hotel-diner",
    buttonLabel: "Load Hybrid Hotel + Diner",
    description: "Multi-unit hospitality rooms + restaurant kitchen with unified IFRS CoA.",
    primaryPack: "CUSTOM_COMPOSABLE",
    isHybridMultiUnit: true,
    primitives: ["HOSPITALITY_FOLIO_USALI", "DINER_RECIPE_TABLE"],
    customer: "Guest",
    invoice: "Guest Folio / Table Check",
    project: "Business Unit",
  },
  {
    id: "logistics-fleet",
    buttonLabel: "Load Logistics & Fleet Haulage",
    description: "Waybill trip costing, diesel/tolls & fleet PPE accounting.",
    primaryPack: "CUSTOM_COMPOSABLE",
    isHybridMultiUnit: false,
    primitives: ["LOGISTICS_FLEET_TRIP"],
    customer: "Shipper",
    invoice: "Waybill Invoice",
    project: "Trip Waybill",
  },
];

interface PackComposerWorkspaceProps {
  initialData: PackWorkspacePayload;
}

export function PackComposerWorkspace({ initialData }: PackComposerWorkspaceProps) {
  const { mode } = useWorkspaceMode();
  const [isPending, startTransition] = useTransition();

  const [savedProfile, setSavedProfile] = useState<WorkspaceIndustryProfile>(initialData.profile);
  const [previewProfile, setPreviewProfile] = useState<WorkspaceIndustryProfile>(
    initialData.profile,
  );
  const [primaryPack, setPrimaryPack] = useState<FlagshipPackCode>(
    initialData.profile.primaryPack,
  );
  const [isHybridMultiUnit, setIsHybridMultiUnit] = useState<boolean>(
    initialData.profile.isHybridMultiUnit,
  );
  const [selectedPrimitives, setSelectedPrimitives] = useState<OperationalPrimitive[]>(
    initialData.profile.activePrimitives.filter((p) => p.enabled).map((p) => p.primitive),
  );
  const [customerLabel, setCustomerLabel] = useState<string>(
    initialData.profile.terminologyMap.customer ?? "Customer",
  );
  const [invoiceLabel, setInvoiceLabel] = useState<string>(
    initialData.profile.terminologyMap.invoice ?? "Invoice",
  );
  const [projectLabel, setProjectLabel] = useState<string>(
    initialData.profile.terminologyMap.project ?? "Business Unit / Job",
  );

  const [statusMessage, setStatusMessage] = useState<string>(
    `Active profile: ${initialData.profile.primaryPack} (${initialData.profile.activePrimitives.length} primitives).`,
  );
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  function buildPayload(): Record<string, unknown> {
    return {
      primaryPack,
      isHybridMultiUnit,
      primitives: selectedPrimitives,
      terminologyOverrides: {
        customer: customerLabel,
        invoice: invoiceLabel,
        project: projectLabel,
      },
    };
  }

  function runPreview(
    nextPrimitives: OperationalPrimitive[],
    nextHybrid: boolean,
    nextPack: FlagshipPackCode,
    vocabOverrides?: { customer: string; invoice: string; project: string },
  ) {
    startTransition(async () => {
      setErrorBanner(null);
      try {
        const res = await fetch("/api/packs/compose-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            primaryPack: nextPack,
            isHybridMultiUnit: nextHybrid,
            primitives: nextPrimitives,
            terminologyOverrides: vocabOverrides ?? {
              customer: customerLabel,
              invoice: invoiceLabel,
              project: projectLabel,
            },
          }),
        });
        const json = (await res.json()) as WorkspaceIndustryProfile | MutationError;
        if (!res.ok || "__typename" in json) {
          const msg = "__typename" in json ? json.message : "Could not compose pack preview.";
          setErrorBanner(msg);
          setStatusMessage(`Composition paused: ${msg}`);
          return;
        }
        setPreviewProfile(json);
        setStatusMessage(
          `Preview updated: ${json.coaAccounts.length} IFRS accounts & ${json.kpiWidgets.length} KPIs ready.`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not compose pack preview.";
        setErrorBanner(msg);
        setStatusMessage(`Composition paused: ${msg}`);
      }
    });
  }

  function handleApplyTemplate(template: BuilderTemplatePreset) {
    setPrimaryPack(template.primaryPack);
    setIsHybridMultiUnit(template.isHybridMultiUnit);
    setSelectedPrimitives(template.primitives);
    setCustomerLabel(template.customer);
    setInvoiceLabel(template.invoice);
    setProjectLabel(template.project);
    runPreview(template.primitives, template.isHybridMultiUnit, template.primaryPack, {
      customer: template.customer,
      invoice: template.invoice,
      project: template.project,
    });
  }

  function handleTogglePrimitive(primitive: OperationalPrimitive) {
    const nextPrimitives = selectedPrimitives.includes(primitive)
      ? selectedPrimitives.filter((item) => item !== primitive)
      : [...selectedPrimitives, primitive];
    const nextHybrid = nextPrimitives.length > 1 ? isHybridMultiUnit || primaryPack === "CUSTOM_COMPOSABLE" : isHybridMultiUnit;
    setSelectedPrimitives(nextPrimitives);
    if (nextPrimitives.length === 0) {
      setErrorBanner("Select at least one operational primitive for this business profile.");
      setStatusMessage("Select at least one operational capability below to preview or save.");
      return;
    }
    runPreview(nextPrimitives, nextHybrid, primaryPack);
  }

  function handleSaveConfiguration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      setErrorBanner(null);
      const res = await fetch("/api/packs/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const json = (await res.json()) as PackWorkspacePayload | MutationError;
      if (!res.ok || "__typename" in json) {
        const msg = "__typename" in json ? json.message : "Could not save business pack.";
        setErrorBanner(msg);
        setStatusMessage(`Save failed: ${msg}`);
        return;
      }
      setSavedProfile(json.profile);
      setPreviewProfile(json.profile);
      setStatusMessage(
        `Saved ${json.profile.primaryPack}: provisioned ${json.profile.coaAccounts.length} conflict-free IFRS accounts.`,
      );
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-3 rounded-2xl border border-borderSubtle bg-surface p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Industry Packs &amp; Modular Capabilities
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink">
            Composable Business Pack Builder
          </h1>
          <p className="mt-1 text-sm text-mutedInk">
            Combine operational building blocks for single or hybrid businesses (for example,
            Retail + Manufacturing or Hotel + Restaurant) without Chart of Accounts conflicts.
          </p>
        </div>
        <div
          data-testid="pack-composer-status"
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            errorBanner
              ? "border-red-300 bg-red-50 text-red-900"
              : "border-emerald-300 bg-emerald-50 text-emerald-900"
          }`}
        >
          <span className="block text-xs font-semibold uppercase tracking-wide">
            {isPending ? "Composing Pack..." : "Pack Engine Ready"}
          </span>
          <span>{errorBanner ?? statusMessage}</span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleSaveConfiguration}
          className="space-y-6 rounded-2xl border border-borderSubtle bg-surface p-6 shadow-sm lg:col-span-7"
        >
          <h2 className="text-lg font-semibold text-ink">
            1. Choose Base Pack &amp; Multi-Unit Structure
          </h2>

          <div className="space-y-2 rounded-xl border border-borderSubtle bg-surfaceAlt p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink">
              Quick-Start Universal Builder Templates (Hospitality, Diner &amp; Hybrid)
            </p>
            <div className="flex flex-wrap gap-2">
              {BUILDER_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleApplyTemplate(tpl)}
                  title={tpl.description}
                  className="min-h-[44px] rounded-full border border-borderSubtle bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-emerald-50 hover:text-emerald-900"
                >
                  {tpl.buttonLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="primary-pack-select"
                className="block text-sm font-medium text-ink"
              >
                Primary Business Template
              </label>
              <select
                id="primary-pack-select"
                value={primaryPack}
                onChange={(e) => {
                  const next = e.target.value as FlagshipPackCode;
                  setPrimaryPack(next);
                  if (selectedPrimitives.length > 0) {
                    runPreview(selectedPrimitives, isHybridMultiUnit, next);
                  }
                }}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-borderSubtle bg-surface px-3 py-2 text-sm text-ink"
              >
                {PACK_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label
                htmlFor="hybrid-multi-unit-checkbox"
                className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl border border-borderSubtle bg-surfaceAlt px-4 py-2 text-sm font-medium text-ink"
              >
                <input
                  id="hybrid-multi-unit-checkbox"
                  type="checkbox"
                  checked={isHybridMultiUnit}
                  onChange={(e) => {
                    const nextHybrid = e.target.checked;
                    setIsHybridMultiUnit(nextHybrid);
                    if (selectedPrimitives.length > 0) {
                      runPreview(selectedPrimitives, nextHybrid, primaryPack);
                    }
                  }}
                  className="h-5 w-5 rounded border-borderSubtle text-primary"
                />
                <span>Hybrid multi-unit business (adds Business Unit split)</span>
              </label>
            </div>
          </div>

          <section aria-labelledby="primitives-heading" className="space-y-3">
            <h2 id="primitives-heading" className="text-lg font-semibold text-ink">
              2. Operational Capability Primitives (10 Modular Building Blocks)
            </h2>
            <p className="text-sm text-mutedInk">
              Tick every operation your business runs. NairaBooks automatically adds the matching
              IFRS accounts, KPIs, and Nigerian tax defaults.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {initialData.primitives.map((spec) => {
                const checked = selectedPrimitives.includes(spec.primitive);
                const inputId = `primitive-${spec.primitive}`;
                return (
                  <label
                    key={spec.primitive}
                    htmlFor={inputId}
                    className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                      checked
                        ? "border-primary bg-emerald-50 text-emerald-900"
                        : "border-borderSubtle bg-surface text-ink hover:bg-surfaceAlt"
                    }`}
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleTogglePrimitive(spec.primitive)}
                      className="mt-1 h-5 w-5 shrink-0 rounded border-borderSubtle text-primary"
                    />
                    <span className="text-sm">
                      <span className="block font-semibold">{spec.displayName}</span>
                      <span className="mt-0.5 block text-xs opacity-90">
                        {spec.plainEnglishSummary}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="vocabulary-heading" className="space-y-3">
            <h2 id="vocabulary-heading" className="text-lg font-semibold text-ink">
              3. Business Vocabulary Customization
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="vocab-customer" className="block text-sm font-medium text-ink">
                  Who pays you?
                </label>
                <input
                  id="vocab-customer"
                  type="text"
                  value={customerLabel}
                  onChange={(e) => setCustomerLabel(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle bg-surface px-3 py-2 text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="vocab-invoice" className="block text-sm font-medium text-ink">
                  Sales Document Name
                </label>
                <input
                  id="vocab-invoice"
                  type="text"
                  value={invoiceLabel}
                  onChange={(e) => setInvoiceLabel(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle bg-surface px-3 py-2 text-sm text-ink"
                />
              </div>
              <div>
                <label htmlFor="vocab-project" className="block text-sm font-medium text-ink">
                  Tracking Unit Label
                </label>
                <input
                  id="vocab-project"
                  type="text"
                  value={projectLabel}
                  onChange={(e) => setProjectLabel(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-borderSubtle bg-surface px-3 py-2 text-sm text-ink"
                />
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={isPending || selectedPrimitives.length === 0}
              onClick={() => runPreview(selectedPrimitives, isHybridMultiUnit, primaryPack)}
              className="min-h-[44px] rounded-full border border-borderSubtle bg-surface px-5 py-2 text-sm font-semibold text-ink hover:bg-surfaceAlt disabled:opacity-50"
            >
              Refresh Live Preview
            </button>
            <button
              type="submit"
              disabled={isPending || selectedPrimitives.length === 0}
              className="min-h-[44px] rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
            >
              {isPending ? "Applying Pack..." : "Apply Pack & Provision IFRS Accounts"}
            </button>
          </div>
        </form>

        <section
          aria-labelledby="composed-preview-heading"
          className="space-y-4 rounded-2xl border border-borderSubtle bg-surface p-6 shadow-sm lg:col-span-5"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="composed-preview-heading" className="text-lg font-semibold text-ink">
              Live Composed Workspace Blueprint
            </h2>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
              Saved: {savedProfile.coaAccounts.length} Accounts
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-borderSubtle bg-surfaceAlt p-3">
              <span className="block text-xs text-mutedInk">Active Primitives</span>
              <span className="mt-0.5 block font-mono text-base font-bold text-ink">
                {previewProfile.activePrimitives.length}
              </span>
            </div>
            <div className="rounded-xl border border-borderSubtle bg-surfaceAlt p-3">
              <span className="block text-xs text-mutedInk">State Consumption Tax</span>
              <span className="mt-0.5 block font-semibold text-ink">
                {previewProfile.taxDefaults.includeStateConsumptionTax ? "Enabled (5%)" : "Off"}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">
              Reporting Dimensions ({previewProfile.dimensions.length})
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {previewProfile.dimensions.map((dim) => (
                <li
                  key={dim.key}
                  className="rounded-full border border-borderSubtle bg-surfaceAlt px-3 py-1 text-xs font-medium text-ink"
                >
                  {dim.label}
                  {dim.required ? " *" : ""}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">
              Merged IFRS Chart of Accounts ({previewProfile.coaAccounts.length})
            </h3>
            <ul className="mt-2 max-h-60 space-y-1.5 overflow-y-auto pr-1 text-xs">
              {previewProfile.coaAccounts.map((acct) => (
                <li
                  key={acct.code}
                  className="flex items-center justify-between rounded-lg border border-borderSubtle px-3 py-2 text-ink"
                >
                  <span>
                    <strong className="font-mono">{acct.code}</strong> — {acct.name}
                  </span>
                  <span className="rounded bg-surfaceAlt px-2 py-0.5 font-mono text-[11px] text-mutedInk">
                    {acct.category}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {mode === "pro" && (
            <div className="rounded-xl border border-borderSubtle bg-surfaceAlt p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink">
                Declarative IFRS CoA &amp; JSON Manifest Preview
              </h3>
              <pre className="mt-2 max-h-64 overflow-auto text-[11px] leading-relaxed text-ink">
                {JSON.stringify(previewProfile, null, 2)}
              </pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
