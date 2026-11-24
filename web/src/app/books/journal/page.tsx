import { cookies } from "next/headers";
import { JournalVoucherComposer } from "@/components/JournalVoucherComposer";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import {
  fetchChartOfAccounts,
  fetchFiscalPeriods,
  fetchJournalVouchers,
} from "@/lib/bff-client";
import {
  getOptionalSessionFromToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-bff";
import { ensureHydrated } from "@/lib/persistence";

export const dynamic = "force-dynamic";

export default async function JournalVouchersPage() {
  await ensureHydrated();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const activeSession = getOptionalSessionFromToken(token);
  const workspaceId = activeSession?.workspace?.id;

  const [accounts, periods, connection] = await Promise.all([
    fetchChartOfAccounts(workspaceId, token),
    fetchFiscalPeriods(workspaceId, token),
    fetchJournalVouchers(25, workspaceId, token),
  ]);

  return (
    <>
      <TopNavCapsule activeTab="books" />
      <main id="main-content">
        <JournalVoucherComposer
          accounts={accounts}
          periods={periods}
          initialVouchers={connection.edges}
        />
      </main>
    </>
  );
}
