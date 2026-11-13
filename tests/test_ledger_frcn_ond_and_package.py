from __future__ import annotations

from decimal import Decimal

from nairabooks.ledger.application.use_cases import GenerateFrcnPackageUseCase
from nairabooks.ledger.domain import CurrencyCode
from tests.test_ledger_trial_balance_and_ifrs import _seed_two_year_ledger


def test_value_added_statement_distributes_exact_wealth_created() -> None:
    store, workspace_id, _, fy2025, fy2026, _ = _seed_two_year_ledger()

    pkg = GenerateFrcnPackageUseCase(store).execute(
        workspace_id=workspace_id,
        fiscal_period_id=fy2026.id,
    )

    assert pkg.statement_currency is CurrencyCode.NGN
    assert pkg.is_balanced is True

    by_label = {row.line_label: row for row in pkg.value_added_statement}
    # Revenue 450,000 - Bought-in 150,000 = Value Added 300,000
    assert by_label["Value Added"].amount_ngn == Decimal("300000.00")
    assert by_label["Value Added"].percentage_share == Decimal("100.000000")

    assert by_label["To Pay Employees"].amount_ngn == Decimal("120000.00")
    assert by_label["To Pay Employees"].percentage_share == Decimal("40.000000")
    assert by_label["To Pay Government (Taxes)"].amount_ngn == Decimal("20000.00")
    assert by_label["Depreciation & Asset Replacement"].amount_ngn == Decimal("30000.00")
    assert by_label["Retained for Future Expansion"].amount_ngn == Decimal("130000.00")

    distributed_sum = (
        by_label["To Pay Employees"].amount_ngn
        + by_label["To Pay Providers of Capital"].amount_ngn
        + by_label["To Pay Government (Taxes)"].amount_ngn
        + by_label["Depreciation & Asset Replacement"].amount_ngn
        + by_label["Retained for Future Expansion"].amount_ngn
    )
    assert distributed_sum == by_label["Value Added"].amount_ngn


def test_five_year_financial_summary_and_snapshot_hash_for_year_end_close() -> None:
    store, workspace_id, _, fy2025, fy2026, _ = _seed_two_year_ledger()

    pkg = GenerateFrcnPackageUseCase(store).execute(
        workspace_id=workspace_id,
        fiscal_period_id=fy2026.id,
    )

    assert [col.fiscal_year_label for col in pkg.five_year_summary] == ["FY2025", "FY2026"]

    y2025 = pkg.five_year_summary[0]
    assert y2025.revenue_ngn == Decimal("100000.00")
    assert y2025.profit_before_tax_ngn == Decimal("100000.00")
    assert y2025.total_assets_ngn == Decimal("100000.00")
    assert y2025.net_equity_ngn == Decimal("100000.00")

    y2026 = pkg.five_year_summary[1]
    assert y2026.revenue_ngn == Decimal("450000.00")
    assert y2026.profit_before_tax_ngn == Decimal("150000.00")
    assert y2026.total_assets_ngn == Decimal("2750000.00")
    assert y2026.net_equity_ngn == Decimal("2730000.00")

    assert len(pkg.snapshot_hash) == 64
    csv_export = pkg.to_trial_balance_csv()
    assert "1010,Zenith Bank Current,ASSET,2650000.00,0.00" in csv_export
