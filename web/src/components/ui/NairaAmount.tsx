import React from "react";

export function NairaSign({
  className = "",
}: {
  readonly className?: string;
}) {
  return (
    <span
      className={`font-sans font-medium select-none inline ${className}`}
      aria-hidden="true"
    >
      ₦
    </span>
  );
}

export function NairaAmount({
  amount,
  showDecimals = true,
  className = "",
  monoClassName = "tabular-nums font-mono",
}: {
  readonly amount: number;
  readonly showDecimals?: boolean;
  readonly className?: string;
  readonly monoClassName?: string;
}) {
  const numPart = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);

  return (
    <span className={`inline-flex items-baseline whitespace-nowrap ${className}`}>
      <span
        className="font-sans font-medium text-[0.88em] mr-0.5 select-none inline"
        aria-hidden="true"
      >
        ₦
      </span>
      <span className={monoClassName}>{numPart}</span>
    </span>
  );
}

/**
 * Parses any string that may contain a Naira symbol (e.g. "₦5,420,000" or "Net +₦13.50M")
 * and ensures the Naira glyph is wrapped in a guaranteed sans-serif fallback so Samsung Internet
 * and Android web browsers never display a missing-glyph tofu box (▯).
 */
export function renderWithNairaSign(text: string, className = ""): React.ReactNode {
  if (!text || !text.includes("₦")) {
    return text;
  }
  const parts = text.split("₦");
  return parts.map((part, index) => (
    <React.Fragment key={index}>
      {index > 0 && <NairaSign className={className} />}
      {part}
    </React.Fragment>
  ));
}
