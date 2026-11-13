"use client";

import React from "react";
import type {
  FiscalPeriod,
  FrcnFinancialStatementPackage,
} from "@/types/ledger";
import { ReportsHubWorkspace } from "./reports/ReportsHubWorkspace";

export function FrcnReportsDashboard({
  periods,
  initialPackage,
  defaultReportId = null,
}: {
  readonly periods: readonly FiscalPeriod[];
  readonly initialPackage: FrcnFinancialStatementPackage;
  readonly defaultReportId?: string | null;
}) {
  return (
    <ReportsHubWorkspace
      periods={periods}
      initialPackage={initialPackage}
      defaultReportId={defaultReportId}
    />
  );
}
