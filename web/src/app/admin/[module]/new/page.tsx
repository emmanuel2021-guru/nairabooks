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
  params: Promise<{ module: string }>;
}): Promise<Metadata> {
  const { module } = await params;
  const meta = ADMIN_MODULES.find((m) => m.id === module);
  return {
    title: meta ? `New ${meta.singularLabel} | NairaBooks` : "New Record | NairaBooks",
  };
}

export default async function AdminCreateRecordPage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  if (!isRecordModuleId(module)) {
    notFound();
  }

  return (
    <>
      <TopNavCapsule activeTab="admin" />
      <AdminEditorRouteClient mode="create" moduleId={module} />
    </>
  );
}
