import { TaxEngineWorkspace } from "@/components/TaxEngineWorkspace";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { fetchTaxProfile } from "@/lib/tax-bff";

export const dynamic = "force-dynamic";

export default async function NigerianTaxEnginePage() {
  const result = await fetchTaxProfile("2026-03-01");
  if (result.status !== 200 || !("profile" in result.body)) {
    throw new Error("Could not load Nigerian Tax Engine profile.");
  }

  return (
    <>
      <TopNavCapsule activeTab="reports" />
      <main id="main-content">
        <TaxEngineWorkspace initialData={result.body} />
      </main>
    </>
  );
}
