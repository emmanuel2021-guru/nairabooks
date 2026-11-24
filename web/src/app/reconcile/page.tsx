import { cookies } from "next/headers";
import { BankReconciliationWorkspace } from "@/components/BankReconciliationWorkspace";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { fetchChartOfAccounts } from "@/lib/bff-client";
import {
  getOptionalSessionFromToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-bff";
import { ensureHydrated } from "@/lib/persistence";

export const dynamic = "force-dynamic";

export default async function ReconcilePage() {
  await ensureHydrated();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const activeSession = getOptionalSessionFromToken(token);
  const workspaceId = activeSession?.workspace?.id;

  const accounts = await fetchChartOfAccounts(workspaceId, token);

  return (
    <>
      <TopNavCapsule activeTab="reconcile" />
      <main id="main-content">
        <BankReconciliationWorkspace accounts={accounts} workspaceId={workspaceId} />
      </main>
    </>
  );
}
