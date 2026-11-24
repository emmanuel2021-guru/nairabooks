import type { Metadata } from "next";
import React from "react";
import { cookies } from "next/headers";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import {
  TransactionsHubWorkspace,
  type TransactionsWorkspaceView,
} from "@/components/TransactionsHubWorkspace";
import {
  isTransactionTypeId,
  type TransactionTypeId,
} from "@/components/transactions/transactions-data";
import {
  getOptionalSessionFromToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-bff";
import { ensureHydrated } from "@/lib/persistence";

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
  await ensureHydrated();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const activeSession = getOptionalSessionFromToken(token);
  const workspaceId = activeSession?.workspace?.id;

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
          workspaceId={workspaceId}
          initialType={initialType}
          initialChoice={initialChoice}
        />
      </main>
    </>
  );
}
