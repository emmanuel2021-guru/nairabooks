import React from "react";
import { cookies } from "next/headers";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { OverviewLandingClient } from "@/components/OverviewLandingClient";
import {
  getOptionalSessionFromToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-bff";
import {
  fetchChartOfAccounts,
  fetchJournalVouchers,
  fetchKpiSummary,
} from "@/lib/bff-client";
import { ensureHydrated } from "@/lib/persistence";
import { buildLiveOverview } from "@/lib/overview-bff";

const DEMO_WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  await ensureHydrated();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const activeSession = getOptionalSessionFromToken(token);
  const workspaceId = activeSession?.workspace?.id;

  const [accounts, connection, kpiSummary] = await Promise.all([
    fetchChartOfAccounts(workspaceId, token),
    fetchJournalVouchers(25, workspaceId, token),
    fetchKpiSummary(workspaceId, token),
  ]);

  // Real companies see figures from their own books; the demo keeps its sample dashboard.
  const liveOverview =
    workspaceId && workspaceId !== DEMO_WORKSPACE_ID ? buildLiveOverview(workspaceId) : undefined;

  const workspaceName =
    activeSession?.workspace?.legalName ?? "Lagos Trading & Hospitality Ltd";
  const workspaceRc = activeSession?.workspace?.rcNumber ?? "RC 1482910";

  return (
    <>
      <TopNavCapsule activeTab="overview" />
      <OverviewLandingClient
        authenticatedUser={activeSession?.user ?? null}
        workspaceName={workspaceName}
        workspaceRc={workspaceRc}
        accountCount={kpiSummary.accountCount || accounts.length}
        voucherCount={kpiSummary.voucherCount}
        bankBalanceNgn={kpiSummary.bankBalanceNgn}
        receivablesNgn={kpiSummary.receivablesNgn}
        payablesNgn={kpiSummary.payablesNgn}
        netIncomeNgn={kpiSummary.netIncomeNgn}
        isZeroState={kpiSummary.isZeroState}
        liveOverview={liveOverview}
      />
    </>
  );
}
