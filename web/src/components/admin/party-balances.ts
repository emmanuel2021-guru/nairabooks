/**
 * Live customer / vendor balances: the opening balance typed on the Admin record plus every
 * posted transaction for that party (matched by name), using the same receivable/payable
 * movements as the ledger and the aging reports.
 */
import type { AdminRecord } from "@/components/admin/admin-maintain-data";
import type { TransactionRecord } from "@/components/transactions/transactions-data";
import { isPostingTransaction, toAmount } from "@/lib/posting-rules";

/** + increases what the customer owes us, - reduces it. */
const RECEIVABLE_MOVES: Readonly<Record<string, 1 | -1>> = {
  "sales-invoicing": 1,
  "invoice-time-expenses": 1,
  "finance-charge": 1,
  "receive-money": -1,
  "credit-memos": -1,
};

/** + increases what we owe the vendor, - reduces it. */
const PAYABLE_MOVES: Readonly<Record<string, 1 | -1>> = {
  bills: 1,
  "purchases-receive-inventory": 1,
  "void-checks": 1,
  payments: -1,
  "select-for-payment": -1,
  "vendor-credit-memos": -1,
};

const key = (name: string) => name.trim().toLowerCase();

/** What this transaction adds to the party's balance (WHT withheld is not owed). */
function movement(tx: TransactionRecord, moves: Readonly<Record<string, 1 | -1>>): number {
  const sign = moves[tx.typeId];
  if (!sign) return 0;
  const amount = sign > 0 ? tx.amountNgn - (tx.whtAmountNgn || 0) : tx.amountNgn;
  return sign * amount;
}

/** Opening balance on the record, signed to the party's normal side (DR customers, CR vendors). */
function openingBalance(rec: AdminRecord, normalSide: "DR" | "CR"): number {
  const amount = toAmount(rec.primaryMetricValue.replace(/\s*(DR|CR)\s*$/i, ""));
  const side = rec.balanceSide ?? (/CR\s*$/i.test(rec.primaryMetricValue) ? "CR" : "DR");
  return side === normalSide ? amount : -amount;
}

function formatBalance(amount: number): string {
  return `₦${Math.abs(amount).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function livePartyBalance(
  rec: AdminRecord,
  transactions: readonly TransactionRecord[],
): number | null {
  const isCustomer = rec.module === "customers";
  if (!isCustomer && rec.module !== "vendors") return null;
  const moves = isCustomer ? RECEIVABLE_MOVES : PAYABLE_MOVES;
  let balance = openingBalance(rec, isCustomer ? "DR" : "CR");
  for (const tx of transactions) {
    if (key(tx.counterparty) === key(rec.name) && isPostingTransaction(tx)) {
      balance += movement(tx, moves);
    }
  }
  return Math.round(balance * 100) / 100;
}

/** Records for display, with customers' and vendors' balances brought up to date. */
export function withLivePartyBalances(
  records: readonly AdminRecord[],
  transactions: readonly TransactionRecord[],
): readonly AdminRecord[] {
  return records.map((rec) => {
    const balance = livePartyBalance(rec, transactions);
    if (balance === null) return rec;
    const normal = rec.module === "customers" ? "DR" : "CR";
    const side = balance >= 0 ? normal : normal === "DR" ? "CR" : "DR";
    return { ...rec, primaryMetricValue: `${formatBalance(balance)} ${side}`, balanceSide: side };
  });
}
