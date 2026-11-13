/**
 * Pure BigInt fixed-precision decimal arithmetic for NGN kobo (10^-2) and FX rates (10^-6).
 * Zero IEEE-754 floating-point arithmetic is used anywhere in this module.
 */

import type { CurrencyCode, JournalLineDraft } from "@/types/ledger";

const DECIMAL_PATTERN = /^(\d+)(?:\.(\d+))?$/;
const RATE_SCALE = 1_000_000n;
const HALF_RATE_SCALE = 500_000n;

function scaleUnsignedDecimal(raw: string, places: number): bigint {
  const cleaned = raw.trim().replace(/,/g, "");
  if (!cleaned) {
    return 0n;
  }
  const match = DECIMAL_PATTERN.exec(cleaned);
  if (!match) {
    throw new Error(`Invalid non-negative decimal string: "${raw}"`);
  }
  const wholePart = match[1] ?? "0";
  const fracPart = match[2] ?? "";

  const truncated = fracPart.slice(0, places).padEnd(places, "0");
  const nextDigit = fracPart.length > places ? Number.parseInt(fracPart.charAt(places), 10) : 0;

  let scaled = BigInt(`${wholePart}${truncated}`);
  if (nextDigit >= 5) {
    scaled += 1n;
  }
  return scaled;
}

/**
 * Parse a decimal money string into minor units (kobo = 10^-2) with ROUND_HALF_UP.
 */
export function parseMoneyToKobo(raw: string): bigint {
  return scaleUnsignedDecimal(raw, 2);
}

/**
 * Safe parser returning null for non-empty malformed text during interactive typing.
 */
export function tryParseMoneyToKobo(raw: string): bigint | null {
  try {
    return scaleUnsignedDecimal(raw, 2);
  } catch {
    return null;
  }
}

/**
 * Parse an FX rate string to 10^-6 scaled BigInt using ROUND_HALF_UP.
 */
export function parseRateScaled(raw: string): bigint {
  return scaleUnsignedDecimal(raw, 6);
}

/**
 * Convert transaction amount to functional NGN kobo via BigInt scaled division (half-up).
 */
export function convertToNgnKobo(
  amountRaw: string,
  currency: CurrencyCode,
  exchangeRateToNgnRaw: string,
): bigint {
  const amountKobo = parseMoneyToKobo(amountRaw);
  if (currency === "NGN") {
    return amountKobo;
  }
  const rateScaled = parseRateScaled(exchangeRateToNgnRaw);
  if (rateScaled <= 0n) {
    throw new Error("Exchange rate must be strictly positive.");
  }
  return (amountKobo * rateScaled + HALF_RATE_SCALE) / RATE_SCALE;
}

/**
 * Format BigInt kobo as fixed 2dp numeric string or Naira display string ("₦15,000.13").
 */
export function formatKobo(
  kobo: bigint,
  options: { readonly symbol?: boolean } = {},
): string {
  const isNegative = kobo < 0n;
  const abs = isNegative ? -kobo : kobo;
  const whole = abs / 100n;
  const cents = (abs % 100n).toString().padStart(2, "0");
  const wholeStr = options.symbol
    ? whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    : whole.toString();
  const prefix = isNegative ? "-" : "";
  const currencyPrefix = options.symbol ? "₦" : "";
  return `${prefix}${currencyPrefix}${wholeStr}.${cents}`;
}

export interface BalanceSummary {
  readonly totalDebitKobo: bigint;
  readonly totalCreditKobo: bigint;
  readonly varianceKobo: bigint;
  readonly isBalanced: boolean;
  readonly hasParseError: boolean;
}

/**
 * Summarize live composer lines cleanly without ever invoking Number floats.
 */
export function summarizeJournalBalance(
  lines: readonly Pick<
    JournalLineDraft,
    "debitAmount" | "creditAmount" | "currency" | "exchangeRateToNgn"
  >[],
): BalanceSummary {
  let totalDebitKobo = 0n;
  let totalCreditKobo = 0n;
  let hasParseError = false;

  for (const line of lines) {
    const rate = line.currency === "NGN" ? "1.000000" : line.exchangeRateToNgn;
    try {
      totalDebitKobo += convertToNgnKobo(line.debitAmount, line.currency, rate);
      totalCreditKobo += convertToNgnKobo(line.creditAmount, line.currency, rate);
    } catch {
      hasParseError = true;
    }
  }

  const diff = totalDebitKobo - totalCreditKobo;
  const varianceKobo = diff < 0n ? -diff : diff;
  const isBalanced = !hasParseError && totalDebitKobo > 0n && varianceKobo === 0n;

  return {
    totalDebitKobo,
    totalCreditKobo,
    varianceKobo,
    isBalanced,
    hasParseError,
  };
}
