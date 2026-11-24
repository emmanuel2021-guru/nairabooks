"use client";

import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Plus, Scale, Trash2 } from "lucide-react";
import {
  formatNaira,
  parseAmountNumber,
  type TransactionLineItem,
  type TransactionTypeId,
} from "@/components/transactions/transactions-data";
import type { EditorLayoutKind } from "@/components/transactions/transaction-editor-schemas";
import { loadAdminRecords } from "@/components/admin/admin-store";
import { loadTransactions } from "@/components/transactions/transactions-store";
import {
  computePayslip,
  computeStockCount,
  computeStockOnHand,
  isTrackedStockItem,
  parseAccountCode,
  stockItemUnitCost,
  stockItemUnitPrice,
} from "@/lib/posting-rules";

/** Types whose lines buy stock in (priced at cost) rather than sell it (priced at list). */
const PURCHASE_LINE_TYPES: ReadonlySet<string> = new Set([
  "purchase-orders",
  "select-for-purchase-orders",
  "purchases-receive-inventory",
  "bills",
  "write-checks",
  "vendor-credit-memos",
]);

/**
 * Account choices for a line: the company's chart, plus the line's current value if it is
 * not in the chart (older records) and an empty "automatic" choice.
 */
function AccountOptions({
  options,
  value,
  emptyLabel,
}: {
  readonly options: readonly string[];
  readonly value: string;
  readonly emptyLabel: string;
}) {
  return (
    <>
      <option value="">{emptyLabel}</option>
      {value && !options.includes(value) && <option value={value}>{value}</option>}
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </>
  );
}

interface LayoutCanvasProps {
  readonly layout: EditorLayoutKind;
  readonly typeId: TransactionTypeId;
  readonly isFullMode: boolean;
  readonly accountOptions: readonly string[];
  readonly lineItems: readonly TransactionLineItem[];
  readonly onUpdateLine: (index: number, patch: Partial<TransactionLineItem>) => void;
  readonly onAddLine: (entryKind?: TransactionLineItem["entryKind"]) => void;
  readonly onRemoveLine: (index: number) => void;
  readonly details: Readonly<Record<string, string>>;
  readonly onUpdateDetail: (key: string, value: string) => void;
  readonly vatEnabled: boolean;
  readonly memo: string;
  readonly onMemoChange: (value: string) => void;
}

interface IndexedLineRow {
  readonly line: TransactionLineItem;
  readonly originalIndex: number;
}

interface LineItemsTableProps {
  readonly title: string;
  readonly addButtonLabel: string;
  readonly rowAriaPrefix: string;
  readonly typeId: TransactionTypeId;
  readonly descriptionPlaceholder: string;
  readonly emptyMessage?: string;
  readonly rows: readonly IndexedLineRow[];
  readonly totalLineCount: number;
  readonly isFullMode: boolean;
  readonly accountOptions: readonly string[];
  readonly vatEnabled: boolean;
  readonly prefersReduced: boolean | null;
  readonly onAdd: () => void;
  readonly onUpdateLine: (index: number, patch: Partial<TransactionLineItem>) => void;
  readonly onRemoveLine: (index: number) => void;
}

function LineItemsTable({
  title,
  addButtonLabel,
  rowAriaPrefix,
  typeId,
  descriptionPlaceholder,
  emptyMessage,
  rows,
  totalLineCount,
  isFullMode,
  accountOptions,
  vatEnabled,
  prefersReduced,
  onAdd,
  onUpdateLine,
  onRemoveLine,
}: LineItemsTableProps) {
  const inventoryItems = React.useMemo(() => {
    return loadAdminRecords().filter((r) => r.module === "inventory");
  }, []);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-[#1C1C1E]">{title}</p>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-3.5 text-xs font-semibold text-[#1C1C1E] transition hover:bg-[#F2F2F7]"
        >
          <Plus className="h-3.5 w-3.5 text-[#006838]" aria-hidden="true" />
          <span>{addButtonLabel}</span>
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-[#D1D1D6] bg-[#FAFAFC] px-4 py-4 text-xs font-medium text-[#5E5E64]">
          {emptyMessage ?? "No items added yet."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[16px] border border-[#E5E5EA]">
          <table className="w-full min-w-[640px] border-collapse bg-white text-left text-xs">
            <thead className="border-b border-[#E5E5EA] bg-[#FAFAFC] text-[11px] font-bold text-[#5E5E64]">
              <tr>
                <th scope="col" className="px-3 py-2.5">Description</th>
                {isFullMode && <th scope="col" className="px-3 py-2.5">GL Account</th>}
                <th scope="col" className="px-3 py-2.5 text-right">Qty</th>
                <th scope="col" className="px-3 py-2.5 text-right">Unit Price (₦)</th>
                {vatEnabled && <th scope="col" className="px-3 py-2.5 text-center">VAT 7.5%</th>}
                <th scope="col" className="px-3 py-2.5 text-right">Line Total</th>
                <th scope="col" className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              <AnimatePresence initial={false}>
                {rows.map(({ line, originalIndex }, displayIndex) => {
                  const lineBase = line.quantity * line.unitPriceNgn;
                  const rowNum = displayIndex + 1;
                  return (
                    <motion.tr
                      key={line.id}
                      initial={prefersReduced ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReduced ? undefined : { opacity: 0 }}
                    >
                      <td className="px-3 py-2">
                        {inventoryItems.length > 0 && (
                          <div className="mb-1">
                            <select
                              aria-label={`${rowAriaPrefix} ${rowNum} Inventory Item Picker`}
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                if (!selectedId) return;
                                const item = inventoryItems.find((i) => i.id === selectedId);
                                if (item) {
                                  const isPurchase = PURCHASE_LINE_TYPES.has(typeId);
                                  const price = isPurchase
                                    ? stockItemUnitCost(item)
                                    : stockItemUnitPrice(item);
                                  const glCode = parseAccountCode(
                                    isPurchase ? item.details?.glInventoryAcct : item.details?.glSalesAcct,
                                  );
                                  const glOption = glCode
                                    ? accountOptions.find((opt) => parseAccountCode(opt) === glCode)
                                    : undefined;
                                  onUpdateLine(originalIndex, {
                                    description: item.name,
                                    unitPriceNgn: price > 0 ? price : line.unitPriceNgn,
                                    accountCode: glOption ?? line.accountCode,
                                    itemId: item.id,
                                  });
                                }
                              }}
                              className="min-h-[26px] w-full rounded-[6px] border border-[#E5E5EA] bg-[#FAFAFC] px-1.5 text-[11px] font-medium text-[#006838]"
                              value={line.itemId ?? ""}
                            >
                              <option value="">-- Pick from Inventory ({inventoryItems.length}) --</option>
                              {inventoryItems.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                  {inv.code} — {inv.name} ({inv.primaryMetricValue || "₦0.00"})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <input
                          aria-label={`${rowAriaPrefix} ${rowNum} Description`}
                          type="text"
                          value={line.description}
                          onChange={(e) =>
                            onUpdateLine(originalIndex, { description: e.target.value })
                          }
                          placeholder={descriptionPlaceholder}
                          className="min-h-[38px] w-full rounded-[10px] border border-[#D1D1D6] bg-white px-2.5 text-xs font-medium text-[#1C1C1E]"
                        />
                      </td>
                      {isFullMode && (
                        <td className="px-3 py-2">
                          <select
                            aria-label={`${rowAriaPrefix} ${rowNum} Account`}
                            value={line.accountCode}
                            onChange={(e) =>
                              onUpdateLine(originalIndex, { accountCode: e.target.value })
                            }
                            className="min-h-[38px] w-full rounded-[10px] border border-[#D1D1D6] bg-white px-2 text-xs font-medium text-[#1C1C1E]"
                          >
                            <AccountOptions
                              options={accountOptions}
                              value={line.accountCode}
                              emptyLabel="Default account (automatic)"
                            />
                          </select>
                        </td>
                      )}
                      <td className="px-3 py-2 text-right">
                        <input
                          aria-label={`${rowAriaPrefix} ${rowNum} Quantity`}
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) =>
                            onUpdateLine(originalIndex, {
                              quantity: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                          className="min-h-[38px] w-16 rounded-[10px] border border-[#D1D1D6] bg-white px-2 text-right font-mono text-xs font-semibold text-[#1C1C1E]"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          aria-label={`${rowAriaPrefix} ${rowNum} Unit Price (NGN)`}
                          type="number"
                          min="0"
                          value={line.unitPriceNgn}
                          onChange={(e) =>
                            onUpdateLine(originalIndex, {
                              unitPriceNgn: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="min-h-[38px] w-28 rounded-[10px] border border-[#D1D1D6] bg-white px-2.5 text-right font-mono text-xs font-bold text-[#1C1C1E]"
                        />
                      </td>
                      {vatEnabled && (
                        <td className="px-3 py-2 text-center">
                          <input
                            aria-label={`${rowAriaPrefix} ${rowNum} Apply 7.5% VAT`}
                            type="checkbox"
                            checked={line.vatApplicable}
                            onChange={(e) =>
                              onUpdateLine(originalIndex, { vatApplicable: e.target.checked })
                            }
                            className="h-4 w-4 accent-[#006838]"
                          />
                        </td>
                      )}
                      <td className="nb-money-cell px-3 py-2 text-xs font-bold text-[#1C1C1E]">
                        {formatNaira(lineBase)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {totalLineCount > 1 && (
                          <button
                            type="button"
                            onClick={() => onRemoveLine(originalIndex)}
                            aria-label={`Remove ${rowAriaPrefix.toLowerCase()} ${rowNum}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#5E5E64] hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function TransactionLayoutCanvas({
  layout,
  typeId,
  isFullMode,
  accountOptions,
  lineItems,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
  details,
  onUpdateDetail,
  vatEnabled,
  memo,
  onMemoChange,
}: LayoutCanvasProps) {
  const prefersReduced = useReducedMotion();

  if (layout === "payroll-slip") {
    const slip = computePayslip(details);
    const gross = slip.gross;
    const empPencom = slip.employeePension;
    const erPencom = slip.employerPension;
    const nhf = slip.nhf;
    const netPay = Math.max(0, slip.netPay);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="pay-basic" className="block text-xs font-semibold text-[#1C1C1E]">
              Basic Salary (₦)
            </label>
            <input
              id="pay-basic"
              type="number"
              min="0"
              value={details.basicSalary ?? "390000"}
              onChange={(e) => onUpdateDetail("basicSalary", e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3 font-mono text-sm font-semibold text-[#1C1C1E]"
            />
          </div>
          <div>
            <label htmlFor="pay-housing" className="block text-xs font-semibold text-[#1C1C1E]">
              Housing Allowance (₦)
            </label>
            <input
              id="pay-housing"
              type="number"
              min="0"
              value={details.housingAllowance ?? "160000"}
              onChange={(e) => onUpdateDetail("housingAllowance", e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3 font-mono text-sm font-semibold text-[#1C1C1E]"
            />
          </div>
          <div>
            <label htmlFor="pay-transport" className="block text-xs font-semibold text-[#1C1C1E]">
              Transport Allowance (₦)
            </label>
            <input
              id="pay-transport"
              type="number"
              min="0"
              value={details.transportAllowance ?? "100000"}
              onChange={(e) => onUpdateDetail("transportAllowance", e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3 font-mono text-sm font-semibold text-[#1C1C1E]"
            />
          </div>
          <div>
            <label htmlFor="pay-paye" className="block text-xs font-semibold text-[#1C1C1E]">
              Monthly PAYE Tax (₦)
            </label>
            <input
              id="pay-paye"
              type="number"
              min="0"
              value={details.payeTax ?? "68400"}
              onChange={(e) => onUpdateDetail("payeTax", e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3 font-mono text-sm font-semibold text-[#1C1C1E]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-[16px] border border-[#F5DDA3] bg-[#FEF9E6] p-4 sm:grid-cols-5">
          <div>
            <p className="text-[11px] font-semibold text-[#784507]">Gross Salary</p>
            <p className="nb-money-cell mt-0.5 text-left text-sm font-bold text-[#1C1C1E]">
              {formatNaira(gross)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#784507]">Employee PenCom (8%)</p>
            <p className="nb-money-cell mt-0.5 text-left text-sm font-bold text-[#1C1C1E]">
              {formatNaira(empPencom)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#784507]">Employer PenCom (10%)</p>
            <p className="nb-money-cell mt-0.5 text-left text-sm font-bold text-[#1C1C1E]">
              {formatNaira(erPencom)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#784507]">NHF (2.5% Basic)</p>
            <p className="nb-money-cell mt-0.5 text-left text-sm font-bold text-[#1C1C1E]">
              {formatNaira(nhf)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#00582E]">Net Take-Home</p>
            <p className="nb-money-cell mt-0.5 text-left text-sm font-bold text-[#00582E]">
              {formatNaira(netPay)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (layout === "inventory-bom") {
    const isAssembly = typeId === "assemblies";
    const count = computeStockCount(typeId, details);
    const yieldQty = count.deltaQty;
    const deltaQty = count.deltaQty;
    const totalImpact = count.value;
    const stockItems = loadAdminRecords().filter(
      (r) => r.module === "inventory" && isTrackedStockItem(r),
    );

    function pickStockItem(itemId: string) {
      onUpdateDetail("itemId", itemId);
      const item = stockItems.find((i) => i.id === itemId);
      if (!item) return;
      const cost = stockItemUnitCost(item);
      if (cost > 0) onUpdateDetail("unitCost", String(cost));
      if (!isAssembly) {
        const onHand = computeStockOnHand(stockItems, loadTransactions()).get(item.id) ?? 0;
        onUpdateDetail("systemQty", String(onHand));
        onUpdateDetail("actualQty", String(onHand));
      }
    }

    return (
      <div className="space-y-4">
        {stockItems.length > 0 && (
          <div>
            <label htmlFor="inv-item" className="block text-xs font-semibold text-[#1C1C1E]">
              {isAssembly ? "Finished Item Built" : "Stock Item Counted"}
            </label>
            <select
              id="inv-item"
              value={details.itemId ?? ""}
              onChange={(e) => pickStockItem(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3 text-sm font-medium text-[#1C1C1E]"
            >
              <option value="">-- Choose a stock item ({stockItems.length}) --</option>
              {stockItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} — {item.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {isAssembly ? (
            <div>
              <label htmlFor="inv-yield-qty" className="block text-xs font-semibold text-[#1C1C1E]">
                Finished Units to Build
              </label>
              <input
                id="inv-yield-qty"
                type="number"
                min="1"
                value={details.yieldQuantity ?? "50"}
                onChange={(e) => onUpdateDetail("yieldQuantity", e.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3 font-mono text-sm font-semibold text-[#1C1C1E]"
              />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="inv-sys-qty" className="block text-xs font-semibold text-[#1C1C1E]">
                  System Quantity on Hand
                </label>
                <input
                  id="inv-sys-qty"
                  type="number"
                  value={details.systemQty ?? "206"}
                  onChange={(e) => onUpdateDetail("systemQty", e.target.value)}
                  className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3 font-mono text-sm font-semibold text-[#1C1C1E]"
                />
              </div>
              <div>
                <label htmlFor="inv-act-qty" className="block text-xs font-semibold text-[#1C1C1E]">
                  Actual Physical Count
                </label>
                <input
                  id="inv-act-qty"
                  type="number"
                  value={details.actualQty ?? "200"}
                  onChange={(e) => onUpdateDetail("actualQty", e.target.value)}
                  className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3 font-mono text-sm font-semibold text-[#1C1C1E]"
                />
              </div>
            </>
          )}
          <div>
            <label htmlFor="inv-unit-cost" className="block text-xs font-semibold text-[#1C1C1E]">
              Weighted Unit Cost (₦)
            </label>
            <input
              id="inv-unit-cost"
              type="number"
              min="0"
              value={details.unitCost ?? "7600"}
              onChange={(e) => onUpdateDetail("unitCost", e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3 font-mono text-sm font-semibold text-[#1C1C1E]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#E5E5EA] bg-[#FAFAFC] px-4 py-3">
          <div>
            <p className="text-xs font-bold text-[#1C1C1E]">
              {isAssembly
                ? `Assembly Yield: +${yieldQty} finished units`
                : `Stock Variance: ${deltaQty >= 0 ? `+${deltaQty}` : deltaQty} units`}
            </p>
            <p className="text-[11px] text-[#5E5E64]">
              IAS 2 cost impact automatically reflected in Inventory &amp; Shrinkage/BOM accounts.
            </p>
          </div>
          <p className="nb-money-cell text-base font-bold text-[#1C1C1E]">
            {formatNaira(totalImpact)}
          </p>
        </div>
      </div>
    );
  }

  if (layout === "settlement") {
    const supportsDirectManualItems = typeId === "receive-money" || typeId === "payments";
    const indexedLines: IndexedLineRow[] = lineItems.map((line, originalIndex) => ({
      line,
      originalIndex,
    }));
    const manualRows = supportsDirectManualItems
      ? indexedLines.filter((item) => item.line.entryKind === "manual-item")
      : [];
    const settlementRows = supportsDirectManualItems
      ? indexedLines.filter((item) => item.line.entryKind !== "manual-item")
      : indexedLines;
    const isReceipt = typeId === "receive-money";

    return (
      <div className="space-y-5">
        {supportsDirectManualItems && (
          <LineItemsTable
            typeId={typeId}
            title={
              isReceipt
                ? "Direct Items Received (No Invoice Needed)"
                : "Direct Items Paid (No Bill / Invoice Needed)"
            }
            addButtonLabel="Add Manual Item"
            rowAriaPrefix="Manual Item"
            descriptionPlaceholder={
              isReceipt
                ? "Walk-in sale, service, or item paid on this receipt"
                : "Item, utility, supply, or direct expense paid"
            }
            emptyMessage="No direct manual items yet. Click Add Manual Item to pay or receive items without creating an invoice first."
            rows={manualRows}
            totalLineCount={lineItems.length}
            isFullMode={isFullMode}
            accountOptions={accountOptions}
            vatEnabled={vatEnabled}
            prefersReduced={prefersReduced}
            onAdd={() => onAddLine("manual-item")}
            onUpdateLine={onUpdateLine}
            onRemoveLine={onRemoveLine}
          />
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-[#1C1C1E]">
              {supportsDirectManualItems
                ? isReceipt
                  ? "Apply to Open Customer Invoices (Optional)"
                  : "Apply to Open Supplier Bills (Optional)"
                : "Tick Invoices, Bills, or Batches Included"}
            </p>
            <button
              type="button"
              onClick={() =>
                onAddLine(supportsDirectManualItems ? "invoice-link" : undefined)
              }
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-3.5 text-xs font-semibold text-[#1C1C1E] hover:bg-[#F2F2F7]"
            >
              <Plus className="h-3.5 w-3.5 text-[#006838]" aria-hidden="true" />
              <span>
                {supportsDirectManualItems
                  ? isReceipt
                    ? "Link Open Invoice"
                    : "Link Open Bill"
                  : "Add Item"}
              </span>
            </button>
          </div>

          {settlementRows.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-[#D1D1D6] bg-[#FAFAFC] px-4 py-3 text-xs font-medium text-[#5E5E64]">
              {isReceipt
                ? "No open customer invoices linked. Leave blank for direct non-invoiced receipts."
                : "No open vendor bills linked. Leave blank for direct non-invoiced payments."}
            </div>
          ) : (
            <div className="divide-y divide-[#E5E5EA] overflow-hidden rounded-[16px] border border-[#E5E5EA] bg-white">
              {settlementRows.map(({ line, originalIndex }, displayIndex) => {
                const isChecked = line.selected !== false;
                const rowNum = displayIndex + 1;
                return (
                  <div
                    key={line.id}
                    className={`flex flex-col gap-3 px-4 py-3 transition sm:flex-row sm:items-center sm:justify-between ${
                      isChecked ? "bg-[#E6F5ED]/35" : "bg-white opacity-70"
                    }`}
                  >
                    <div className="flex flex-1 items-center gap-3">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isChecked}
                        aria-label={`Include ${line.description || `item ${rowNum}`}`}
                        onClick={() => onUpdateLine(originalIndex, { selected: !isChecked })}
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition ${
                          isChecked
                            ? "border-[#006838] bg-[#006838] text-white"
                            : "border-[#D1D1D6] bg-white text-transparent"
                        }`}
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <label htmlFor={`settle-desc-${line.id}`} className="sr-only">
                          Settlement {rowNum} Reference or Description
                        </label>
                        <input
                          id={`settle-desc-${line.id}`}
                          type="text"
                          value={line.description}
                          onChange={(e) =>
                            onUpdateLine(originalIndex, { description: e.target.value })
                          }
                          placeholder={
                            isReceipt
                              ? "Customer invoice # or reference"
                              : "Vendor bill # or reference"
                          }
                          className="min-h-[38px] w-full rounded-[10px] border border-[#E5E5EA] bg-white px-3 text-xs font-semibold text-[#1C1C1E]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label htmlFor={`settle-amt-${line.id}`} className="sr-only">
                        Settlement {rowNum} Amount (NGN)
                      </label>
                      <input
                        id={`settle-amt-${line.id}`}
                        type="number"
                        min="0"
                        value={line.unitPriceNgn}
                        onChange={(e) =>
                          onUpdateLine(originalIndex, {
                            unitPriceNgn: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="min-h-[38px] w-36 rounded-[10px] border border-[#D1D1D6] bg-white px-3 text-right font-mono text-xs font-bold text-[#1C1C1E]"
                      />
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveLine(originalIndex)}
                          aria-label={`Remove settlement line ${rowNum}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#5E5E64] hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (layout === "journal-grid") {
    const totalDebit = lineItems.reduce((acc, l) => acc + (l.debitNgn ?? 0), 0);
    const totalCredit = lineItems.reduce((acc, l) => acc + (l.creditNgn ?? 0), 0);
    const diff = Math.abs(totalDebit - totalCredit);
    const balanced = diff < 0.01 && totalDebit > 0;

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            aria-live="polite"
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold ${
              balanced
                ? "border-[#BDE5CF] bg-[#E6F5ED] text-[#00582E]"
                : "border-[#F5DDA3] bg-[#FEF9E6] text-[#784507]"
            }`}
          >
            <Scale className="h-3.5 w-3.5" aria-hidden="true" />
            {balanced
              ? `Balanced (${formatNaira(totalDebit)})`
              : `Out of balance by ${formatNaira(diff)}`}
          </div>

          <button
            type="button"
            onClick={() => onAddLine()}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#D1D1D6] bg-white px-3.5 text-xs font-semibold text-[#1C1C1E] hover:bg-[#F2F2F7]"
          >
            <Plus className="h-3.5 w-3.5 text-[#006838]" aria-hidden="true" />
            <span>Add Journal Line</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-[16px] border border-[#E5E5EA]">
          <table className="w-full min-w-[620px] border-collapse bg-white text-left text-xs">
            <thead className="border-b border-[#E5E5EA] bg-[#FAFAFC] text-[11px] font-bold text-[#5E5E64]">
              <tr>
                <th scope="col" className="px-3 py-2.5">GL Account</th>
                <th scope="col" className="px-3 py-2.5">Line Memo</th>
                <th scope="col" className="px-3 py-2.5 text-right">Debit (₦)</th>
                <th scope="col" className="px-3 py-2.5 text-right">Credit (₦)</th>
                <th scope="col" className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {lineItems.map((line, index) => (
                <tr key={line.id}>
                  <td className="px-3 py-2">
                    <select
                      aria-label={`Line ${index + 1} GL Account`}
                      value={line.accountCode}
                      onChange={(e) => onUpdateLine(index, { accountCode: e.target.value })}
                      className="min-h-[38px] w-full rounded-[10px] border border-[#D1D1D6] bg-white px-2.5 text-xs font-semibold text-[#1C1C1E]"
                    >
                      <AccountOptions
                        options={accountOptions}
                        value={line.accountCode}
                        emptyLabel="Choose an account…"
                      />
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      aria-label={`Line ${index + 1} Memo`}
                      type="text"
                      value={line.description}
                      onChange={(e) => onUpdateLine(index, { description: e.target.value })}
                      placeholder="Line explanation"
                      className="min-h-[38px] w-full rounded-[10px] border border-[#D1D1D6] bg-white px-2.5 text-xs text-[#1C1C1E]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      aria-label={`Line ${index + 1} Debit (NGN)`}
                      type="number"
                      min="0"
                      value={line.debitNgn ?? 0}
                      onChange={(e) =>
                        onUpdateLine(index, {
                          debitNgn: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="min-h-[38px] w-28 rounded-[10px] border border-[#D1D1D6] bg-white px-2.5 text-right font-mono text-xs font-bold text-[#1C1C1E]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      aria-label={`Line ${index + 1} Credit (NGN)`}
                      type="number"
                      min="0"
                      value={line.creditNgn ?? 0}
                      onChange={(e) =>
                        onUpdateLine(index, {
                          creditNgn: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="min-h-[38px] w-28 rounded-[10px] border border-[#D1D1D6] bg-white px-2.5 text-right font-mono text-xs font-bold text-[#1C1C1E]"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {lineItems.length > 2 && (
                      <button
                        type="button"
                        onClick={() => onRemoveLine(index)}
                        aria-label={`Remove journal line ${index + 1}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#5E5E64] hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (layout === "reconcile-clear" || layout === "workflow-note") {
    const firstAmt = lineItems[0]?.unitPriceNgn ?? 0;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="wf-summary-desc" className="block text-xs font-semibold text-[#1C1C1E]">
              {layout === "reconcile-clear" ? "Reconciliation / Cheque Summary" : "Task / Notice Summary"}
            </label>
            <input
              id="wf-summary-desc"
              type="text"
              value={lineItems[0]?.description ?? ""}
              onChange={(e) => onUpdateLine(0, { description: e.target.value })}
              className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3.5 text-sm font-medium text-[#1C1C1E]"
            />
          </div>
          <div>
            <label htmlFor="wf-amount" className="block text-xs font-semibold text-[#1C1C1E]">
              Amount / Value Involved (₦)
            </label>
            <input
              id="wf-amount"
              type="number"
              min="0"
              value={firstAmt}
              onChange={(e) =>
                onUpdateLine(0, { unitPriceNgn: Math.max(0, Number(e.target.value) || 0) })
              }
              className="mt-1.5 min-h-[44px] w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3.5 font-mono text-sm font-bold text-[#1C1C1E]"
            />
          </div>
        </div>
        <div>
          <label htmlFor="wf-body-memo" className="block text-xs font-semibold text-[#1C1C1E]">
            Detailed Notes / Letter Content
          </label>
          <textarea
            id="wf-body-memo"
            rows={4}
            value={memo}
            onChange={(e) => onMemoChange(e.target.value)}
            placeholder="Write clear plain-English notes, audit justification, or letter message..."
            className="mt-1.5 w-full rounded-[14px] border border-[#D1D1D6] bg-white p-3.5 text-sm text-[#1C1C1E]"
          />
        </div>
      </div>
    );
  }

  // Default: "line-items" (Invoices, Quotes, POs, Bills, Credit Memos, Checks, Register, Time/Expense)
  return (
    <LineItemsTable
      typeId={typeId}
      title="Line Items & Amounts"
      addButtonLabel="Add Line Item"
      rowAriaPrefix="Line"
      descriptionPlaceholder="Item or service description"
      rows={lineItems.map((line, originalIndex) => ({ line, originalIndex }))}
      totalLineCount={lineItems.length}
      isFullMode={isFullMode}
      accountOptions={accountOptions}
      vatEnabled={vatEnabled}
      prefersReduced={prefersReduced}
      onAdd={() => onAddLine()}
      onUpdateLine={onUpdateLine}
      onRemoveLine={onRemoveLine}
    />
  );
}
