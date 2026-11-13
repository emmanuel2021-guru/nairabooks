"""Strict Decimal monetary primitives for NGN and approved FX currencies."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from enum import StrEnum

from nairabooks.ledger.domain.errors import ValidationError

MONEY_QUANTUM = Decimal("0.01")
RATE_QUANTUM = Decimal("0.000001")
ZERO_MONEY = Decimal("0.00")
UNITY_RATE = Decimal("1.000000")

MoneyInput = Decimal | int | str


class CurrencyCode(StrEnum):
    """Supported transaction currencies aligned with the GraphQL and SQL enums."""

    NGN = "NGN"
    USD = "USD"
    GBP = "GBP"
    EUR = "EUR"


def parse_decimal(value: MoneyInput, *, quantum: Decimal, field: str) -> Decimal:
    """Parse an exact numeric input without permitting binary floats."""
    if isinstance(value, float) or isinstance(value, bool):
        raise ValidationError(
            f"Field '{field}' must be Decimal, int, or str; float/bool is prohibited.",
            field=field,
        )
    try:
        dec = value if isinstance(value, Decimal) else Decimal(str(value).strip())
    except (InvalidOperation, ValueError) as exc:
        raise ValidationError(
            f"Field '{field}' is not a valid decimal number.",
            field=field,
        ) from exc

    if not dec.is_finite():
        raise ValidationError(f"Field '{field}' must be finite.", field=field)
    return dec.quantize(quantum, rounding=ROUND_HALF_UP)


@dataclass(frozen=True, slots=True)
class Money:
    """Immutable monetary value paired with functional NGN equivalent."""

    amount: Decimal
    currency: CurrencyCode
    functional_amount_ngn: Decimal
    exchange_rate_to_ngn: Decimal

    @classmethod
    def of(
        cls,
        amount: MoneyInput,
        currency: CurrencyCode = CurrencyCode.NGN,
        exchange_rate_to_ngn: MoneyInput = UNITY_RATE,
        *,
        field_prefix: str = "amount",
    ) -> Money:
        """Construct quantized Money enforcing non-negative amounts and valid FX rates."""
        parsed_amount = parse_decimal(amount, quantum=MONEY_QUANTUM, field=field_prefix)
        if parsed_amount < ZERO_MONEY:
            raise ValidationError(
                f"Monetary amount for '{field_prefix}' cannot be negative.",
                field=field_prefix,
            )

        parsed_rate = parse_decimal(
            exchange_rate_to_ngn,
            quantum=RATE_QUANTUM,
            field=f"{field_prefix}.exchange_rate_to_ngn",
        )
        if parsed_rate <= Decimal("0"):
            raise ValidationError(
                "Exchange rate to NGN must be strictly positive.",
                field="exchange_rate_to_ngn",
            )
        if currency is CurrencyCode.NGN and parsed_rate != UNITY_RATE:
            raise ValidationError(
                "NGN amounts must use exchange_rate_to_ngn = 1.000000.",
                field="exchange_rate_to_ngn",
            )

        functional_ngn = (parsed_amount * parsed_rate).quantize(
            MONEY_QUANTUM, rounding=ROUND_HALF_UP
        )
        return cls(
            amount=parsed_amount,
            currency=currency,
            functional_amount_ngn=functional_ngn,
            exchange_rate_to_ngn=parsed_rate,
        )

    @classmethod
    def zero(
        cls,
        currency: CurrencyCode = CurrencyCode.NGN,
        exchange_rate_to_ngn: MoneyInput = UNITY_RATE,
    ) -> Money:
        """Return a quantized zero Money value in the given currency."""
        rate = UNITY_RATE if currency is CurrencyCode.NGN else exchange_rate_to_ngn
        return cls.of(ZERO_MONEY, currency=currency, exchange_rate_to_ngn=rate)

    def is_positive(self) -> bool:
        """Return True when both transaction and functional amounts exceed zero."""
        return self.amount > ZERO_MONEY and self.functional_amount_ngn > ZERO_MONEY
