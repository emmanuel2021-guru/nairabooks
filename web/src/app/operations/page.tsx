import { FlagshipOperationsWorkspace } from "@/components/FlagshipOperationsWorkspace";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { fetchFlagshipsViaBff, fetchPackWorkspace } from "@/lib/packs-bff";
import type { FlagshipPackCode } from "@/types/packs";

export const dynamic = "force-dynamic";

export default async function FlagshipOperationsPage() {
  const [flagshipsRes, workspaceRes] = await Promise.all([
    fetchFlagshipsViaBff(),
    fetchPackWorkspace(),
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
