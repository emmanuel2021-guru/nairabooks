import { cookies } from "next/headers";
import { FrcnReportsDashboard } from "@/components/FrcnReportsDashboard";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { fetchFiscalPeriods, fetchFrcnPackage } from "@/lib/bff-client";
import {
  getOptionalSessionFromToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-bff";
import { ensureHydrated } from "@/lib/persistence";

export const dynamic = "force-dynamic";

export default async function FrcnReportsPage() {
  await ensureHydrated();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const activeSession = getOptionalSessionFromToken(token);
  const workspaceId = activeSession?.workspace?.id;
  const workspaceName =
    activeSession?.workspace?.legalName ?? "Lagos Trading & Hospitality Ltd";
  const workspaceRc = activeSession?.workspace?.rcNumber ?? "RC 1482910";

  const periods = await fetchFiscalPeriods(workspaceId, token);
  const openOrLatest = periods.find((p) => p.status === "OPEN") ?? periods[0];
  if (!openOrLatest) {
    throw new Error("No fiscal periods configured for workspace.");
  }
  const rep = await fetchFrcnPackage(openOrLatest.id, workspaceId, token);
  if (rep.status !== 200 || !("trialBalance" in rep.body)) {
    throw new Error("Could not load FRCN statement package.");
  }

  return (
    <>
      <TopNavCapsule activeTab="reports" />
      <main id="main-content">
        <FrcnReportsDashboard
          periods={periods}
          initialPackage={rep.body}
          workspaceName={workspaceName}
          workspaceRc={workspaceRc}
        />
      </main>
    </>
  );
}
