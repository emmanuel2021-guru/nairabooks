import type { Metadata } from "next";
import React from "react";
import { cookies } from "next/headers";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { AdminMaintainWorkspace } from "@/components/AdminMaintainWorkspace";
import {
  getOptionalSessionFromToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-bff";

import {
  ADMIN_MODULES,
  type AdminModuleId,
} from "@/components/admin/admin-maintain-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Maintain & Admin Studio | NairaBooks",
  description:
    "Manage customers, vendors, employees, Chart of Accounts, budgets, stock items, job costs, fixed assets, company defaults, taxes, and team roles.",
};

export default async function AdminMaintainPage({
  searchParams,
}: {
  searchParams?: Promise<{ module?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const activeSession = getOptionalSessionFromToken(token);

  const resolvedParams = searchParams ? await searchParams : undefined;
  const requestedModule = resolvedParams?.module;
  const initialModule: AdminModuleId | undefined = ADMIN_MODULES.some(
    (m) => m.id === requestedModule,
  )
    ? (requestedModule as AdminModuleId)
    : undefined;

  const workspaceName =
    activeSession?.workspace?.legalName ?? "Lagos Trading & Hospitality Ltd";
  const workspaceRc = activeSession?.workspace?.rcNumber ?? "RC 1482910";

  return (
    <>
      <TopNavCapsule activeTab="admin" />
      <AdminMaintainWorkspace
        workspaceName={workspaceName}
        workspaceRc={workspaceRc}
        initialModule={initialModule}
      />
    </>
  );
}
