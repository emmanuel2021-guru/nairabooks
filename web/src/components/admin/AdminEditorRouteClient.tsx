"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { RecordModuleId } from "@/components/admin/admin-maintain-data";
import { AdminRecordEditorWorkspace } from "@/components/admin/AdminRecordEditorWorkspace";

export function AdminEditorRouteClient({
  mode,
  moduleId,
  recordId,
}: {
  readonly mode: "create" | "edit";
  readonly moduleId: RecordModuleId;
  readonly recordId?: string;
}) {
  const router = useRouter();

  return (
    <AdminRecordEditorWorkspace
      mode={mode}
      moduleId={moduleId}
      recordId={recordId}
      onNavigateBack={(href) => router.push(href)}
    />
  );
}
