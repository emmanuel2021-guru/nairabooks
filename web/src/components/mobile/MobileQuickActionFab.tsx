"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  FileText,
  PackagePlus,
  Plus,
  Receipt,
  UserPlus,
  X,
} from "lucide-react";

export function MobileQuickActionFab() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Flutter-style Floating Action Button (FAB) - Mobile only, docked above bottom navigation */}
      <div aria-label="Mobile quick actions" className="md:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={isOpen ? "Close quick actions" : "Open quick action menu"}
          className="fixed right-4 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-emerald-950/25 active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Plus className="h-7 w-7" aria-hidden="true" />
          </motion.div>
        </button>
      </div>

      {/* Flutter-style Modal Bottom Sheet Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Quick Action Menu"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[28px] border-t border-borderSubtle bg-surface px-5 pt-3 pb-8 shadow-2xl"
            >
              {/* Drag Handle Indicator */}
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-borderSubtle" />

              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-ink tracking-tight">
                    Quick Action
                  </h2>
                  <p className="text-xs text-mutedInk">
                    Record operational transactions on the go
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surfaceAlt text-ink hover:bg-surfaceAlt/80 transition"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Action Tiles Grid (Flutter style) */}
              <div className="space-y-2.5">
                <Link
                  href="/transactions/sales_invoice/new"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3.5 rounded-2xl border border-borderSubtle bg-surfaceAlt/50 p-3.5 transition active:scale-[0.98] hover:bg-surfaceAlt"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400">
                    <FileText className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink">New Sales Invoice</p>
                    <p className="text-xs text-mutedInk">Bill client with 7.5% NRS VAT</p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">&rarr;</span>
                </Link>

                <Link
                  href="/transactions/purchase_invoice/new"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3.5 rounded-2xl border border-borderSubtle bg-surfaceAlt/50 p-3.5 transition active:scale-[0.98] hover:bg-surfaceAlt"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400">
                    <Receipt className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink">Record Vendor Bill / Expense</p>
                    <p className="text-xs text-mutedInk">Diesel, utilities, rent &amp; supplies</p>
                  </div>
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">&rarr;</span>
                </Link>

                <Link
                  href="/transactions/receipt/new"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3.5 rounded-2xl border border-borderSubtle bg-surfaceAlt/50 p-3.5 transition active:scale-[0.98] hover:bg-surfaceAlt"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-400">
                    <ArrowDownLeft className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink">Customer Receipt / Payment</p>
                    <p className="text-xs text-mutedInk">Record bank deposit or POS transfer</p>
                  </div>
                  <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">&rarr;</span>
                </Link>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <Link
                    href="/admin/customers/new"
                    onClick={() => setIsOpen(false)}
                    className="flex flex-col items-start rounded-2xl border border-borderSubtle bg-surfaceAlt/50 p-3 transition active:scale-[0.98] hover:bg-surfaceAlt"
                  >
                    <UserPlus className="h-5 w-5 text-ink mb-1.5" aria-hidden="true" />
                    <span className="text-xs font-bold text-ink">Add Customer</span>
                    <span className="text-[11px] text-mutedInk">Directory entry</span>
                  </Link>

                  <Link
                    href="/admin/inventory/new"
                    onClick={() => setIsOpen(false)}
                    className="flex flex-col items-start rounded-2xl border border-borderSubtle bg-surfaceAlt/50 p-3 transition active:scale-[0.98] hover:bg-surfaceAlt"
                  >
                    <PackagePlus className="h-5 w-5 text-ink mb-1.5" aria-hidden="true" />
                    <span className="text-xs font-bold text-ink">Add Stock Item</span>
                    <span className="text-[11px] text-mutedInk">SKU &amp; price</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
