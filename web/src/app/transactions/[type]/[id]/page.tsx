import type { Metadata } from "next";
import React from "react";
import { notFound } from "next/navigation";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import {
  TRANSACTION_TYPES,
  isTransactionTypeId,
} from "@/components/transactions/transactions-data";
import { TransactionEditorRouteClient } from "@/components/transactions/TransactionEditorRouteClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  const meta = TRANSACTION_TYPES.find((t) => t.id === type);
  return {
    title: meta ? `Edit ${meta.singularLabel} | NairaBooks` : "Edit Transaction | NairaBooks",
  };
}

export default async function TransactionEditPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  if (!isTransactionTypeId(type)) {
    notFound();
  }

  return (
    <>
      <TopNavCapsule activeTab="transactions" />
      <main id="main-content">
        <TransactionEditorRouteClient
          mode="edit"
          typeId={type}
          recordId={decodeURIComponent(id)}
        />
      </main>
    </>
  );
}
