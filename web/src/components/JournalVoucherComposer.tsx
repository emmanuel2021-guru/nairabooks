"use client";

import { useId, useState, useTransition } from "react";
import { formatKobo, summarizeJournalBalance } from "@/lib/decimal";
import { useWorkspaceMode } from "@/state/workspace-mode";
import type {
  ChartOfAccount,
  CurrencyCode,
  FiscalPeriod,
  JournalLineDraft,
  JournalVoucher,
  JournalVoucherEdge,
  MutationError,
} from "@/types/ledger";

interface ComposerLineState extends JournalLineDraft {
  readonly rowKey: string;
}

function makeDefaultLines(accounts: readonly ChartOfAccount[]): ComposerLineState[] {
  const firstId = accounts[0]?.id ?? "";
  const secondId = accounts[1]?.id ?? firstId;
  return [
    {
      rowKey: "row-1",
      accountId: firstId,
      debitAmount: "0.00",
      creditAmount: "0.00",
      currency: "NGN",
      exchangeRateToNgn: "1.000000",
      fundOrDepartmentCode: "",
      memo: "",
    },
    {
      rowKey: "row-2",
      accountId: secondId,
      debitAmount: "0.00",
      creditAmount: "0.00",
      currency: "NGN",
      exchangeRateToNgn: "1.000000",
      fundOrDepartmentCode: "",
      memo: "",
    },
  ];
}

export function JournalVoucherComposer({
  accounts,
  periods,
  initialVouchers,
}: {
  readonly accounts: readonly ChartOfAccount[];
  readonly periods: readonly FiscalPeriod[];
  readonly initialVouchers: readonly JournalVoucherEdge[];
}) {
  const { mode } = useWorkspaceMode();
  const [postingDate, setPostingDate] = useState<string>("2026-04-15");
  const [reference, setReference] = useState<string>("JV-MANUAL-001");
  const [lines, setLines] = useState<ComposerLineState[]>(() => makeDefaultLines(accounts));
  const [vouchers, setVouchers] = useState<readonly JournalVoucher[]>(() =>
    initialVouchers.map((edge) => edge.node),
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [reverseReasonById, setReverseReasonById] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const errorBannerId = useId();
  const postingDateId = useId();
  const referenceId = useId();

  const balance = summarizeJournalBalance(lines);

  const updateLine = (
    index: number,
    patch: Partial<Omit<ComposerLineState, "rowKey">>,
  ) => {
    setLines((prev) =>
      prev.map((line, idx) => (idx === index ? { ...line, ...patch } : line)),
    );
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        rowKey: `row-${prev.length + 1}-${crypto.randomUUID().slice(0, 6)}`,
        accountId: accounts[0]?.id ?? "",
        debitAmount: "0.00",
        creditAmount: "0.00",
        currency: "NGN",
        exchangeRateToNgn: "1.000000",
        fundOrDepartmentCode: "",
        memo: "",
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      return;
    }
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/ledger/vouchers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idempotencyKey: crypto.randomUUID(),
            postingDate,
            reference,
            sourceModule: "GENERAL_LEDGER",
            lines: lines.map((line) => ({
              accountId: line.accountId,
              debitAmount: line.debitAmount || "0.00",
              creditAmount: line.creditAmount || "0.00",
              currency: line.currency,
              exchangeRateToNgn: line.currency === "NGN" ? "1.000000" : line.exchangeRateToNgn,
              fundOrDepartmentCode: line.fundOrDepartmentCode || null,
              memo: line.memo || null,
            })),
          }),
        });
        const data = (await res.json()) as JournalVoucher | MutationError;
        if (!res.ok || data.__typename !== "JournalVoucher") {
          setServerError(
            "message" in data ? data.message : "Could not post journal voucher.",
          );
          return;
        }
        setVouchers((prev) => [data, ...prev]);
        setStatusMessage(
          `Posted ${data.voucherNumber} (${formatKobo(balance.totalDebitKobo, { symbol: true })}) to general ledger.`,
        );
        setLines(makeDefaultLines(accounts));
      } catch {
        setServerError("Network error while posting journal voucher.");
      }
    });
  };

  const handleReverse = (voucherId: string) => {
    const reason = (reverseReasonById[voucherId] ?? "").trim();
    if (!reason) {
      setServerError("Please enter an audit reason before reversing a posted voucher.");
      return;
    }
    setServerError(null);
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/ledger/vouchers/reverse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idempotencyKey: crypto.randomUUID(),
            originalVoucherId: voucherId,
            reversalDate: postingDate,
            reason,
          }),
        });
        const data = (await res.json()) as JournalVoucher | MutationError;
        if (!res.ok || data.__typename !== "JournalVoucher") {
          setServerError(
            "message" in data ? data.message : "Could not reverse voucher.",
          );
          return;
        }
        setVouchers((prev) => [
          data,
          ...prev.map((v) =>
            v.id === voucherId ? { ...v, status: "REVERSED" as const, reversedByVoucherId: data.id } : v,
          ),
        ]);
        setStatusMessage(`Created offsetting reversal voucher ${data.voucherNumber}.`);
      } catch {
        setServerError("Network error while reversing voucher.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 pb-sticky-clearance">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Journal Vouchers & Double-Entry Ledger
          </h1>
          <p className="mt-1 text-sm text-mutedInk">
            {mode === "simple"
              ? "Simple Mode: Enter equal Money In (Debit) and Money Out (Credit) lines. Every Naira is checked to balance before saving."
              : "Pro Mode: Full IFRS/FRCN voucher posting with multi-currency FX rates, fund dimensions, and immutable reversal controls."}
          </p>
        </div>

        <div id="periods" className="flex flex-wrap items-center gap-2">
          {periods.map((period) => (
            <span
              key={period.id}
              className={
                period.status === "OPEN"
                  ? "inline-flex items-center rounded-full border border-emerald-700/30 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900"
                  : "inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800"
              }
            >
              {period.label}: {period.status === "OPEN" ? "Open" : "CAMA Locked"}
            </span>
          ))}
        </div>
      </div>

      <section
        id="voucher-composer"
        aria-labelledby="composer-heading"
        className="rounded-2xl border border-borderSubtle bg-surface p-6 shadow-sm"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="composer-heading" className="text-lg font-semibold text-ink">
            New Double-Entry Journal Voucher
          </h2>

          <div
            data-testid="balance-live-region"
            aria-live="polite"
            role="status"
            className={
              balance.isBalanced
                ? "rounded-full border border-emerald-700/30 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-900"
                : "rounded-full border border-amber-700/30 bg-amber-50 px-4 py-1.5 text-sm font-semibold text-amber-900"
            }
          >
            {balance.hasParseError
              ? "Enter valid non-negative NGN amounts"
              : balance.isBalanced
                ? `Balanced at ${formatKobo(balance.totalDebitKobo, { symbol: true })} (Debits equal Credits)`
                : `Out of balance by ${formatKobo(balance.varianceKobo, { symbol: true })} (Dr ${formatKobo(balance.totalDebitKobo, { symbol: true })} vs Cr ${formatKobo(balance.totalCreditKobo, { symbol: true })})`}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor={postingDateId} className="block text-sm font-medium text-ink">
                Posting Date
              </label>
              <input
                id={postingDateId}
                type="date"
                value={postingDate}
                onChange={(e) => setPostingDate(e.target.value)}
                required
                className="mt-1 block min-h-[44px] w-full rounded-lg border border-borderSubtle bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label htmlFor={referenceId} className="block text-sm font-medium text-ink">
                Voucher Reference
              </label>
              <input
                id={referenceId}
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
                placeholder="e.g. INV-2026-041"
                className="mt-1 block min-h-[44px] w-full rounded-lg border border-borderSubtle bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-borderSubtle">
            <table className="min-w-full divide-y divide-borderSubtle text-left text-sm">
              <thead className="bg-surfaceAlt text-xs font-semibold uppercase tracking-wide text-mutedInk">
                <tr>
                  <th scope="col" className="px-3 py-3">
                    Account
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    {mode === "simple" ? "Money In / Debit (₦)" : "Debit Amount"}
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    {mode === "simple" ? "Money Out / Credit (₦)" : "Credit Amount"}
                  </th>
                  {mode === "pro" ? (
                    <th scope="col" className="px-3 py-3">
                      Currency &amp; FX
                    </th>
                  ) : null}
                  <th scope="col" className="px-3 py-3">
                    Memo / Narration
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderSubtle bg-surface">
                {lines.map((line, idx) => {
                  const rowNum = idx + 1;
                  return (
                    <tr key={line.rowKey}>
                      <td className="px-3 py-2.5">
                        <select
                          aria-label={`Line ${rowNum} Account`}
                          value={line.accountId}
                          onChange={(e) => updateLine(idx, { accountId: e.target.value })}
                          className="min-h-[44px] w-full min-w-[200px] rounded-lg border border-borderSubtle bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          {accounts.map((acct) => (
                            <option key={acct.id} value={acct.id}>
                              {acct.code} — {acct.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-3 py-2.5">
                        <input
                          aria-label={`Line ${rowNum} Debit amount (NGN)`}
                          type="text"
                          inputMode="decimal"
                          value={line.debitAmount}
                          onChange={(e) => updateLine(idx, { debitAmount: e.target.value })}
                          className="nb-money-cell min-h-[44px] w-full min-w-[130px] rounded-lg border border-borderSubtle bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </td>

                      <td className="px-3 py-2.5">
                        <input
                          aria-label={`Line ${rowNum} Credit amount (NGN)`}
                          type="text"
                          inputMode="decimal"
                          value={line.creditAmount}
                          onChange={(e) => updateLine(idx, { creditAmount: e.target.value })}
                          className="nb-money-cell min-h-[44px] w-full min-w-[130px] rounded-lg border border-borderSubtle bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </td>

                      {mode === "pro" ? (
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <select
                              aria-label={`Line ${rowNum} Currency`}
                              value={line.currency}
                              onChange={(e) =>
                                updateLine(idx, {
                                  currency: e.target.value as CurrencyCode,
                                  exchangeRateToNgn: e.target.value === "NGN" ? "1.000000" : "1600.000000",
                                })
                              }
                              className="min-h-[44px] rounded-lg border border-borderSubtle bg-surface px-2 py-2 text-sm text-ink"
                            >
                              <option value="NGN">NGN</option>
                              <option value="USD">USD</option>
                              <option value="GBP">GBP</option>
                              <option value="EUR">EUR</option>
                            </select>
                            <input
                              aria-label={`Line ${rowNum} FX rate to NGN`}
                              type="text"
                              inputMode="decimal"
                              disabled={line.currency === "NGN"}
                              value={line.exchangeRateToNgn}
                              onChange={(e) => updateLine(idx, { exchangeRateToNgn: e.target.value })}
                              className="nb-money-cell min-h-[44px] w-28 rounded-lg border border-borderSubtle bg-surface px-2 py-2 text-sm text-ink disabled:bg-surfaceAlt"
                            />
                          </div>
                        </td>
                      ) : null}

                      <td className="px-3 py-2.5">
                        <input
                          aria-label={`Line ${rowNum} Memo`}
                          type="text"
                          value={line.memo ?? ""}
                          onChange={(e) => updateLine(idx, { memo: e.target.value })}
                          placeholder="Description"
                          className="min-h-[44px] w-full min-w-[160px] rounded-lg border border-borderSubtle bg-surface px-3 py-2 text-sm text-ink"
                        />
                      </td>

                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          disabled={lines.length <= 2}
                          aria-label={`Remove line ${rowNum}`}
                          className="min-h-[44px] rounded-lg border border-borderSubtle px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surfaceAlt disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {serverError ? (
            <div
              id={errorBannerId}
              role="alert"
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
            >
              {serverError}
            </div>
          ) : null}

          {statusMessage ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
            >
              {statusMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={addLine}
              className="min-h-[44px] rounded-full border border-borderSubtle bg-surface px-5 py-2 text-sm font-semibold text-ink hover:bg-surfaceAlt"
            >
              + Add Journal Line
            </button>

            <button
              type="submit"
              disabled={isPending}
              aria-describedby={serverError ? errorBannerId : undefined}
              className="min-h-[44px] rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
            >
              {isPending ? "Posting Entry..." : "Post Balanced Entry"}
            </button>
          </div>
        </form>
      </section>

      <section
        id="register"
        aria-labelledby="register-heading"
        className="rounded-2xl border border-borderSubtle bg-surface p-6 shadow-sm"
      >
        <h2 id="register-heading" className="mb-4 text-lg font-semibold text-ink">
          Posted Journal Register
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-borderSubtle text-left text-sm">
            <thead className="bg-surfaceAlt text-xs font-semibold uppercase tracking-wide text-mutedInk">
              <tr>
                <th scope="col" className="px-3 py-3">
                  Voucher No.
                </th>
                <th scope="col" className="px-3 py-3">
                  Date
                </th>
                <th scope="col" className="px-3 py-3">
                  Reference
                </th>
                <th scope="col" className="px-3 py-3">
                  Status
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Total NGN
                </th>
                {mode === "pro" ? (
                  <th scope="col" className="px-3 py-3">
                    Audit Reversal
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-borderSubtle bg-surface">
              {vouchers.map((voucher) => (
                <tr key={voucher.id}>
                  <th scope="row" className="px-3 py-3 font-mono text-xs font-semibold text-ink">
                    {voucher.voucherNumber}
                  </th>
                  <td className="px-3 py-3 text-ink">{voucher.postingDate}</td>
                  <td className="px-3 py-3 text-ink">{voucher.reference}</td>
                  <td className="px-3 py-3">
                    <span
                      className={
                        voucher.status === "POSTED"
                          ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900"
                          : "inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800"
                      }
                    >
                      {voucher.status}
                    </span>
                  </td>
                  <td className="nb-money-cell px-3 py-3 font-medium text-ink">
                    ₦{voucher.totalDebitNgn}
                  </td>
                  {mode === "pro" ? (
                    <td className="px-3 py-3">
                      {voucher.status === "POSTED" ? (
                        <div className="flex items-center gap-2">
                          <input
                            aria-label={`Reversal reason for ${voucher.voucherNumber}`}
                            type="text"
                            placeholder="Audit reason"
                            value={reverseReasonById[voucher.id] ?? ""}
                            onChange={(e) =>
                              setReverseReasonById((prev) => ({
                                ...prev,
                                [voucher.id]: e.target.value,
                              }))
                            }
                            className="min-h-[44px] w-40 rounded-lg border border-borderSubtle px-2.5 py-1.5 text-xs text-ink"
                          />
                          <button
                            type="button"
                            onClick={() => handleReverse(voucher.id)}
                            className="min-h-[44px] rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-900 hover:bg-red-100"
                          >
                            Reverse
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-mutedInk">Reversed</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
