import type { Metadata } from "next";
import React from "react";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import {
  TransactionsHubWorkspace,
  type TransactionsWorkspaceView,
} from "@/components/TransactionsHubWorkspace";
import {
  isTransactionTypeId,
  type TransactionTypeId,
} from "@/components/transactions/transactions-data";

export const metadata: Metadata = {
  title: "Transactions Hub | NairaBooks",
  description:
    "Choose to create a new transaction, browse the full transaction list, or edit existing records in one minimalist Nigerian accounting hub.",
};

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; choice?: string }>;
}) {
  const resolved = await searchParams;
  const initialType: TransactionTypeId | undefined =
    resolved.type && isTransactionTypeId(resolved.type) ? resolved.type : undefined;

  const initialChoice: TransactionsWorkspaceView | undefined =
    resolved.choice === "create" ||
    resolved.choice === "list" ||
    resolved.choice === "edit"
      ? resolved.choice
      : undefined;

  return (
    <>
      <TopNavCapsule activeTab="transactions" />
      <main id="main-content">
        <TransactionsHubWorkspace
          initialType={initialType}
          initialChoice={initialChoice}
        />
      </main>
    </>
  );
}
