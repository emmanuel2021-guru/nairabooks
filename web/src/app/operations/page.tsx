import { FlagshipOperationsWorkspace } from "@/components/FlagshipOperationsWorkspace";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { cookies } from "next/headers";
import { getOptionalSessionFromToken, SESSION_COOKIE_NAME } from "@/lib/auth-bff";
import { fetchFlagshipsViaBff, fetchPackWorkspace } from "@/lib/packs-bff";
import type { FlagshipPackCode } from "@/types/packs";
import { ensureHydrated } from "@/lib/persistence";

export const dynamic = "force-dynamic";

export default async function FlagshipOperationsPage() {
  await ensureHydrated();
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const workspaceId = getOptionalSessionFromToken(token)?.workspace?.id;
  const [flagshipsRes, workspaceRes] = await Promise.all([
    fetchFlagshipsViaBff(),
    fetchPackWorkspace(workspaceId),
  ]);
  if (flagshipsRes.status !== 200 || !("items" in flagshipsRes.body)) {
    throw new Error("Could not load Nigerian Flagship Industry Packs.");
  }

  const currentPack: FlagshipPackCode =
    workspaceRes.status === 200 && "profile" in workspaceRes.body
      ? workspaceRes.body.profile.primaryPack
      : "RETAIL_ECOMMERCE";

  return (
    <>
      <TopNavCapsule activeTab="people" />
      <main id="main-content">
        <FlagshipOperationsWorkspace
          presets={flagshipsRes.body.items}
          initialPackCode={currentPack}
        />
      </main>
    </>
  );
}
