"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { NairaBooksLoader } from "@/components/NairaBooksLoader";
import { Button } from "@/components/ui/button";
import { CompanyWizardStepOne } from "@/components/onboarding/CompanyWizardStepOne";
import {
  CompanyWizardStepFour,
  CompanyWizardStepThree,
  CompanyWizardStepTwo,
  type WizardFormState,
} from "@/components/onboarding/CompanyWizardStepsTwoThreeFour";

const WIZARD_STEPS = [
  { id: 1 as const, label: "1. Business" },
  { id: 2 as const, label: "2. Company" },
  { id: 3 as const, label: "3. Rules & Tax" },
  { id: 4 as const, label: "4. Launch" },
];

export function SignupWorkspace() {
  const prefersReduced = useReducedMotion();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [showGlCodes, setShowGlCodes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [formState, setFormState] = useState<WizardFormState>({
    setupMethod: "INDUSTRY_TEMPLATE",
    businessType: "CONSTRUCTION_CONTRACTING",
    customModules: ["hotel", "diner"],
    legalStructure: "LIMITED_COMPANY",
    workspaceName: "",
    rcNumber: "",
    tinNumber: "",
    state: "Lagos",
    address: "",
    fullName: "",
    email: "",
    password: "",
    accountingMethod: "ACCRUAL",
    postingMethod: "REAL_TIME",
    periodStructure: "MONTHLY_12",
    fiscalStartMonth: "January",
    fiscalYear: 2026,
    turnoverBand: "BETWEEN_25M_100M",
  });

  function updateField<K extends keyof WizardFormState>(
    field: K,
    value: WizardFormState[K],
  ) {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setErrorMessage(null);
  }

  function handleToggleModule(moduleId: string) {
    setFormState((prev) => {
      const exists = prev.customModules.includes(moduleId);
      const next = exists
        ? prev.customModules.filter((m) => m !== moduleId)
        : [...prev.customModules, moduleId];
      return { ...prev, customModules: next };
    });
  }

  function handleFillDemo() {
    setFormState((prev) => ({
      ...prev,
      workspaceName: "Lekki Palms Construction Ltd",
      rcNumber: "RC 4092817",
      tinNumber: "24108291-0001",
      state: "Lagos",
      address: "14 Admiralty Way, Lekki Phase 1",
      fullName: "Kemi Adeyemi",
      email: "kemi@lekkipalms.ng",
      password: prev.password.length >= 8 ? prev.password : "NairaBooks#2026",
    }));
    setErrorMessage(null);
  }

  function validateStepTwo(): string | null {
    if (formState.workspaceName.trim().length < 2) {
      return "Please enter your company legal name before moving to Step 3.";
    }
    if (formState.fullName.trim().length < 2) {
      return "Please enter the owner or founder full name.";
    }
    if (!formState.email.includes("@")) {
      return "Please enter a valid work email address.";
    }
    if (formState.password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    return null;
  }

  function goToStep(target: 1 | 2 | 3 | 4) {
    setErrorMessage(null);
    if (target > step && step === 2) {
      const issue = validateStepTwo();
      if (issue) {
        setErrorMessage(issue);
        return;
      }
    }
    if (target === 4 && (formState.workspaceName.trim().length < 2 || formState.password.length < 8)) {
      const issue = validateStepTwo();
      if (issue) {
        setDirection(1);
        setStep(2);
        setErrorMessage(issue);
        return;
      }
    }
    setDirection(target >= step ? 1 : -1);
    setStep(target);
  }

  function handleNext() {
    if (step === 1) {
      goToStep(2);
    } else if (step === 2) {
      goToStep(3);
    } else if (step === 3) {
      goToStep(4);
    }
  }

  function handleBack() {
    setErrorMessage(null);
    setDirection(-1);
    if (step === 4) setStep(3);
    else if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  }

  async function handleLaunchCompany(e: React.FormEvent) {
    e.preventDefault();
    const stepTwoIssue = validateStepTwo();
    if (stepTwoIssue) {
      setDirection(-1);
      setStep(2);
      setErrorMessage(stepTwoIssue);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    let redirecting = false;
    try {
      const startedAt = Date.now();
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formState.fullName,
          email: formState.email,
          password: formState.password,
          workspaceName: formState.workspaceName,
          rcNumber: formState.rcNumber,
          tinNumber: formState.tinNumber,
          legalStructure: formState.legalStructure,
          state: formState.state,
          address: formState.address,
          businessType: formState.businessType,
          setupMethod: formState.setupMethod,
          customModules: formState.customModules,
          accountingMethod: formState.accountingMethod,
          postingMethod: formState.postingMethod,
          periodStructure: formState.periodStructure,
          fiscalStartMonth: formState.fiscalStartMonth,
          fiscalYear: formState.fiscalYear,
          turnoverBand: formState.turnoverBand,
        }),
      });
      const body = (await res.json()) as {
        message?: string;
        workspace?: { legalName: string };
      };
      if (!res.ok) {
        setErrorMessage(body.message ?? "Unable to create business account.");
        return;
      }
      redirecting = true;
      setStatusMessage(
        `Created ${body.workspace?.legalName ?? formState.workspaceName} with Nigerian IFRS & Tax Act 2025 defaults.`,
      );
      const remaining = Math.max(0, 1600 - (Date.now() - startedAt));
      if (remaining > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remaining));
      }
      if (formState.businessType === "CUSTOM_COMPOSABLE") {
        window.location.assign("/packs");
      } else {
        window.location.assign("/overview");
      }
    } catch {
      setErrorMessage("Network error while creating workspace.");
    } finally {
      if (!redirecting) {
        setSubmitting(false);
      }
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-transparent text-[#1C1C1E]">
        {/* iOS Vibrancy Translucent Wizard Header */}
        <header className="nb-ios-glass sticky top-0 z-30 border-b border-[#E5E5EA]">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center gap-2 text-base font-bold tracking-[-0.03em] text-[#1C1C1E]"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#006838] font-mono text-xs font-extrabold text-white shadow-sm">
                ₦
              </span>
              <span>nairabooks</span>
            </Link>

            <nav
              aria-label="Company creation steps"
              className="hidden items-center gap-1 rounded-full bg-[#E5E5EA]/85 p-1 md:flex"
            >
              {WIZARD_STEPS.map((item) => {
                const isActive = step === item.id;
                const isCompleted = step > item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goToStep(item.id)}
                    aria-current={isActive ? "step" : undefined}
                    className={`relative inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
                      isActive
                        ? "text-[#1C1C1E]"
                        : isCompleted
                          ? "text-[#006838]"
                          : "text-[#5E5E64] hover:text-[#1C1C1E]"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="wizard-active-step-pill"
                        transition={{ type: "spring", stiffness: 360, damping: 28 }}
                        className="absolute inset-0 rounded-full bg-white shadow-sm"
                      />
                    )}
                    {isCompleted && (
                      <Check className="relative z-10 h-3 w-3 text-[#006838]" strokeWidth={2.5} aria-hidden="true" />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <Button variant="outline" size="sm" asChild className="rounded-full">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>

          {/* Animated Step Progress Hairline */}
          <div className="h-[3px] w-full bg-[#E5E5EA]" aria-hidden="true">
            <motion.div
              animate={{ width: `${(step / 4) * 100}%` }}
              transition={prefersReduced ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 26 }}
              className="h-full bg-[#006838]"
            />
          </div>
        </header>

        <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 pb-sticky-clearance sm:px-6 sm:py-10">
          {errorMessage ? (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-6 rounded-[16px] border border-[#DC2626]/35 bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#B91C1C]"
            >
              {errorMessage}
            </div>
          ) : null}

          {statusMessage ? (
            <div
              role="status"
              aria-live="polite"
              className="mb-6 rounded-[16px] border border-[#006838]/35 bg-[#E6F5ED] px-4 py-3 text-sm font-medium text-[#00582E]"
            >
              {statusMessage}
            </div>
          ) : null}

          <form onSubmit={handleLaunchCompany} className="space-y-8">
            {submitting ? (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F2F2F7]">
                <NairaBooksLoader
                  heading={`Launching ${formState.workspaceName || "your Nigerian company"}...`}
                />
              </div>
            ) : (
            <motion.div
              key={step}
              initial={
                prefersReduced
                  ? false
                  : { x: direction > 0 ? 34 : -34, y: 4 }
              }
              animate={{ x: 0, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
            >
              {step === 1 && (
                <CompanyWizardStepOne
                  setupMethod={formState.setupMethod}
                  onSetupMethodChange={(m) => updateField("setupMethod", m)}
                  selectedSector={formState.businessType}
                  onSelectSector={(s) => updateField("businessType", s)}
                  selectedModules={formState.customModules}
                  onToggleModule={handleToggleModule}
                  showGlCodes={showGlCodes}
                  onToggleGlCodes={setShowGlCodes}
                />
              )}

              {step === 2 && (
                <CompanyWizardStepTwo
                  state={formState}
                  onChange={updateField}
                  onFillDemo={handleFillDemo}
                />
              )}

              {step === 3 && (
                <CompanyWizardStepThree state={formState} onChange={updateField} />
              )}

              {step === 4 && (
                <CompanyWizardStepFour state={formState} onJumpToStep={goToStep} />
              )}
            </motion.div>
            )}

            {/* Clean Natural-Flow Wizard Footer Controls */}
            <div className="flex flex-col-reverse items-stretch justify-between gap-3 rounded-[20px] border border-[#E5E5EA] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:px-6">
              <div className="flex items-center justify-between gap-3 sm:justify-start">
                {step > 1 ? (
                  <Button type="button" variant="outline" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back
                  </Button>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex min-h-[44px] items-center text-xs font-semibold text-[#5E5E64] hover:text-[#1C1C1E]"
                  >
                    Already registered? Sign in instead
                  </Link>
                )}
                <span className="font-mono text-xs font-medium text-[#5E5E64]">
                  Step {step} of 4
                </span>
              </div>

              {step < 4 ? (
                <Button type="button" variant="emerald" size="lg" onClick={handleNext}>
                  <span>Continue to Step {step + 1}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button type="submit" variant="emerald" size="lg" disabled={submitting}>
                  <span>
                    {submitting
                      ? "Creating Nigerian Company..."
                      : "Create Company & Launch Workspace"}
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </form>
        </main>
      </div>
    </MotionConfig>
  );
}
