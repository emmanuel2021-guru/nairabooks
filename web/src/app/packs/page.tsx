import { PackComposerWorkspace } from "@/components/PackComposerWorkspace";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { cookies } from "next/headers";
import { getOptionalSessionFromToken, SESSION_COOKIE_NAME } from "@/lib/auth-bff";
import { fetchPackWorkspace } from "@/lib/packs-bff";
import { ensureHydrated } from "@/lib/persistence";

export const dynamic = "force-dynamic";

export default async function IndustryPackComposerPage() {
  await ensureHydrated();
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const workspaceId = getOptionalSessionFromToken(token)?.workspace?.id;
  const result = await fetchPackWorkspace(workspaceId);
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
