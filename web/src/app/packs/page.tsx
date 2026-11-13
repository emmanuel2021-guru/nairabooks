import { PackComposerWorkspace } from "@/components/PackComposerWorkspace";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { fetchPackWorkspace } from "@/lib/packs-bff";

export const dynamic = "force-dynamic";

export default async function IndustryPackComposerPage() {
  const result = await fetchPackWorkspace();
  if (result.status !== 200 || !("profile" in result.body)) {
    throw new Error("Could not load Industry Pack Composer profile.");
  }

  return (
    <>
      <TopNavCapsule activeTab="overview" />
      <main id="main-content">
        <PackComposerWorkspace initialData={result.body} />
      </main>
    </>
  );
}
