import type { Metadata } from "next";
import React from "react";
import { notFound } from "next/navigation";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import {
  ADMIN_MODULES,
  isRecordModuleId,
} from "@/components/admin/admin-maintain-data";
import { AdminEditorRouteClient } from "@/components/admin/AdminEditorRouteClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ module: string; id: string }>;
}): Promise<Metadata> {
  const { module } = await params;
  const meta = ADMIN_MODULES.find((m) => m.id === module);
  return {
    title: meta ? `Edit ${meta.singularLabel} | NairaBooks` : "Edit Record | NairaBooks",
  };
}

export default async function AdminEditRecordPage({
  params,
}: {
  params: Promise<{ module: string; id: string }>;
}) {
  const { module, id } = await params;
  if (!isRecordModuleId(module)) {
    notFound();
  }

  return (
    <>
      <TopNavCapsule activeTab="admin" />
      <AdminEditorRouteClient
        mode="edit"
        moduleId={module}
        recordId={decodeURIComponent(id)}
      />
    </>
  );
}
