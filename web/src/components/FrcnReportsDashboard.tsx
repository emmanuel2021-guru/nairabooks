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
  workspaceName = "Lagos Trading & Hospitality Ltd",
  workspaceRc = "RC 1482910",
}: {
  readonly periods: readonly FiscalPeriod[];
  readonly initialPackage: FrcnFinancialStatementPackage;
  readonly defaultReportId?: string | null;
  readonly workspaceName?: string;
  readonly workspaceRc?: string;
}) {
  return (
    <ReportsHubWorkspace
      periods={periods}
      initialPackage={initialPackage}
      defaultReportId={defaultReportId}
      workspaceName={workspaceName}
      workspaceRc={workspaceRc}
    />
  );
}
