import React from "react";
import { cookies } from "next/headers";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { OverviewLandingClient } from "@/components/OverviewLandingClient";
import {
  getOptionalSessionFromToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-bff";
import { fetchChartOfAccounts, fetchJournalVouchers } from "@/lib/bff-client";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const activeSession = getOptionalSessionFromToken(token);

  const [accounts, connection] = await Promise.all([
    fetchChartOfAccounts(),
    fetchJournalVouchers(25),
  ]);

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
        accountCount={accounts.length}
        voucherCount={connection.edges.length}
        bankBalanceNgn="48,250,000.00"
        receivablesNgn="12,480,000.00"
        payablesNgn="4,920,000.00"
      />
    </>
  );
}
