"use client";

import { useEffect } from "react";
import { hydrateAdminFromServer } from "@/components/admin/admin-store";
import { hydrateTransactionsFromServer } from "@/components/transactions/transactions-store";

/** Loads the signed-in workspace's saved Admin/Transactions records once per page load. */
export function RecordsSync(): null {
  useEffect(() => {
    void hydrateTransactionsFromServer();
    void hydrateAdminFromServer();
  }, []);
  return null;
}
