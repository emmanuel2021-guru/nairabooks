import { FrcnReportsDashboard } from "@/components/FrcnReportsDashboard";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { fetchFiscalPeriods, fetchFrcnPackage } from "@/lib/bff-client";

export const dynamic = "force-dynamic";

export default async function FrcnReportsPage() {
  const periods = await fetchFiscalPeriods();
  const openOrLatest = periods.find((p) => p.status === "OPEN") ?? periods[0];
  if (!openOrLatest) {
    throw new Error("No fiscal periods configured for workspace.");
  }
  const rep = await fetchFrcnPackage(openOrLatest.id);
  if (rep.status !== 200 || !("trialBalance" in rep.body)) {
    throw new Error("Could not load FRCN statement package.");
  }

  return (
    <>
      <TopNavCapsule activeTab="reports" />
      <main id="main-content">
        <FrcnReportsDashboard periods={periods} initialPackage={rep.body} />
      </main>
    </>
  );
}
