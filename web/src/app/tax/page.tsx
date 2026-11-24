import { TaxEngineWorkspace } from "@/components/TaxEngineWorkspace";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { cookies } from "next/headers";
import { getOptionalSessionFromToken, SESSION_COOKIE_NAME } from "@/lib/auth-bff";
import { fetchTaxProfile } from "@/lib/tax-bff";
import { ensureHydrated } from "@/lib/persistence";

export const dynamic = "force-dynamic";

export default async function NigerianTaxEnginePage() {
  await ensureHydrated();
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const workspaceId = getOptionalSessionFromToken(token)?.workspace?.id;
  const result = await fetchTaxProfile("2026-03-01", workspaceId);
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
