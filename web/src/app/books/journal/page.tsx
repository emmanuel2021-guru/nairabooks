import { JournalVoucherComposer } from "@/components/JournalVoucherComposer";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import {
  fetchChartOfAccounts,
  fetchFiscalPeriods,
  fetchJournalVouchers,
} from "@/lib/bff-client";

export const dynamic = "force-dynamic";

export default async function JournalVouchersPage() {
  const [accounts, periods, connection] = await Promise.all([
    fetchChartOfAccounts(),
    fetchFiscalPeriods(),
    fetchJournalVouchers(25),
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
