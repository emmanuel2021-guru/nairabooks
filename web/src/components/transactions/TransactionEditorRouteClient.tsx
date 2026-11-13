"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { TransactionTypeId } from "@/components/transactions/transactions-data";
import { TransactionRecordEditorWorkspace } from "@/components/transactions/TransactionRecordEditorWorkspace";

export function TransactionEditorRouteClient({
  mode,
  typeId,
  recordId,
}: {
  readonly mode: "create" | "edit";
  readonly typeId: TransactionTypeId;
  readonly recordId?: string;
}) {
  const router = useRouter();

  return (
    <TransactionRecordEditorWorkspace
      mode={mode}
      typeId={typeId}
      recordId={recordId}
      onNavigateBack={(href) => router.push(href)}
    />
  );
}
