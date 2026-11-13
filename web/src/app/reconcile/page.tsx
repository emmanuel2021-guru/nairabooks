import { BankReconciliationWorkspace } from "@/components/BankReconciliationWorkspace";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { fetchChartOfAccounts } from "@/lib/bff-client";

export const dynamic = "force-dynamic";

export default async function ReconcilePage() {
  const accounts = await fetchChartOfAccounts();

  return (
    <>
      <TopNavCapsule activeTab="reconcile" />
      <main id="main-content">
        <BankReconciliationWorkspace accounts={accounts} />
      </main>
    </>
  );
}
