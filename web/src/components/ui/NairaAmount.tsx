import React from "react";

export function NairaSign({
  className = "",
}: {
  readonly className?: string;
}) {
  return (
    <span
      className={`font-sans font-medium select-none inline-block ${className}`}
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
    <span className={`inline-flex items-baseline ${className}`}>
      <span
        className="font-sans font-medium text-[0.88em] mr-0.5 select-none inline-block"
        aria-hidden="true"
      >
        ₦
      </span>
      <span className={monoClassName}>{numPart}</span>
    </span>
  );
}
