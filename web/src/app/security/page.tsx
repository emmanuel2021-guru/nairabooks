import React from "react";
import { cookies } from "next/headers";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { SecurityAuditWorkspace } from "@/components/SecurityAuditWorkspace";
import {
  fetchSecurityWorkspaceInitialData,
  getOptionalSessionFromToken,
  listAuditEventsViaBff,
  listCamaCertificationsViaBff,
  listWorkspaceMembersViaBff,
  SESSION_COOKIE_NAME,
  verifyAuditChainViaBff,
} from "@/lib/auth-bff";
import { fetchFiscalPeriods } from "@/lib/bff-client";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const activeSession = getOptionalSessionFromToken(token);

  let initialData = await fetchSecurityWorkspaceInitialData();
  if (activeSession?.workspace) {
    const wsId = activeSession.workspace.id;
    initialData = {
      session: activeSession,
      members: listWorkspaceMembersViaBff(wsId),
      periods: await fetchFiscalPeriods(),
      auditEvents: listAuditEventsViaBff(wsId, 50),
      chainVerification: verifyAuditChainViaBff(wsId),
      camaCertifications: listCamaCertificationsViaBff(wsId),
    };
  }

  return (
    <div className="min-h-screen bg-canvas">
      <TopNavCapsule activeTab="overview" />
      <SecurityAuditWorkspace initialData={initialData} />
    </div>
  );
}
