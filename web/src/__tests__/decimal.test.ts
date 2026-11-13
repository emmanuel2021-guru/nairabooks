import { describe, expect, it } from "vitest";
import {
  convertToNgnKobo,
  formatKobo,
  parseMoneyToKobo,
  summarizeJournalBalance,
} from "@/lib/decimal";

describe("Strict BigInt DecimalMoney helpers", () => {
  it("parses exact decimal strings into kobo without IEEE-754 drift", () => {
    // Classic float trap: 0.1 + 0.2 === 0.30000000000000004
    const a = parseMoneyToKobo("0.10");
    const b = parseMoneyToKobo("0.20");
    expect(a + b).toBe(30n);
    expect(formatKobo(a + b)).toBe("0.30");

    // Half-up rounding
    expect(parseMoneyToKobo("15000.125")).toBe(1500013n);
    expect(formatKobo(1500013n, { symbol: true })).toBe("₦15,000.13");
  });

  it("converts FX transaction amounts using 6dp scaled integer arithmetic", () => {
    const kobo = convertToNgnKobo("100.00", "USD", "1625.500001");
    expect(formatKobo(kobo)).toBe("162550.00");
  });

  it("computes exact debit/credit NGN variance for composer lines", () => {
    const balanced = summarizeJournalBalance([
      { debitAmount: "50000.00", creditAmount: "0.00", currency: "NGN", exchangeRateToNgn: "1.000000" },
      { debitAmount: "0.00", creditAmount: "50000.00", currency: "NGN", exchangeRateToNgn: "1.000000" },
    ]);
    expect(balanced.isBalanced).toBe(true);
    expect(balanced.varianceKobo).toBe(0n);
    expect(formatKobo(balanced.totalDebitKobo)).toBe("50000.00");

    const unbalanced = summarizeJournalBalance([
      { debitAmount: "75000.00", creditAmount: "0.00", currency: "NGN", exchangeRateToNgn: "1.000000" },
      { debitAmount: "0.00", creditAmount: "60000.00", currency: "NGN", exchangeRateToNgn: "1.000000" },
    ]);
    expect(unbalanced.isBalanced).toBe(false);
    expect(unbalanced.varianceKobo).toBe(1500000n);
  });
});
