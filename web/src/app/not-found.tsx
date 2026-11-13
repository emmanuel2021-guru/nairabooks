import Link from "next/link";
import React from "react";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center"
    >
      <div className="w-full rounded-[22px] border border-[#E5E5EA] bg-white p-8 shadow-[0_6px_22px_rgba(28,28,30,0.04)]">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#E6F5ED] text-lg font-bold text-[#006838]">
          ₦
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-[-0.025em] text-[#1C1C1E]">
          Page Not Found
        </h1>
        <p className="mt-2 text-sm text-[#5E5E64]">
          That record or transaction route could not be found in NairaBooks.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/overview"
            className="inline-flex min-h-[44px] items-center rounded-full bg-[#006838] px-5 py-2 text-xs font-semibold text-white hover:bg-[#00582E]"
          >
            Back to Overview
          </Link>
          <Link
            href="/transactions"
            className="inline-flex min-h-[44px] items-center rounded-full border border-[#D1D1D6] bg-white px-5 py-2 text-xs font-semibold text-[#1C1C1E] hover:bg-[#F2F2F7]"
          >
            Open Transactions
          </Link>
        </div>
      </div>
    </main>
  );
}
