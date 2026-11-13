"""Smoke tests verifying the Phase 2 NairaBooks Python/uv scaffold and configuration."""

from __future__ import annotations

from decimal import Decimal

from nairabooks import (
    FLAGSHIP_PACKS,
    NairaBooksSettings,
    __version__,
    get_pack_catalog,
    health_status,
)


def test_package_version_and_settings_use_decimal_for_money_and_tax() -> None:
    """Verify currency defaults and strict Decimal precision for VAT and turnover thresholds."""
    settings = NairaBooksSettings()

    assert __version__ == "0.1.0"
    assert settings.app_name == "NairaBooks"
    assert settings.default_currency == "NGN"
    assert settings.decimal_places == 2
    assert isinstance(settings.default_vat_rate, Decimal)
    assert settings.default_vat_rate == Decimal("0.0750")
    assert isinstance(settings.small_business_turnover_limit_ngn, Decimal)
    assert settings.small_business_turnover_limit_ngn == Decimal("100000000.00")


def test_six_flagship_reference_packs_and_custom_builder_registered() -> None:
    """Ensure all 6 confirmed Flagship Reference Packs have unique IDs and builder support."""
    expected_ids = {
        "retail_ecommerce",
        "wholesale_distribution",
        "manufacturing_light",
        "construction_trades",
        "professional_services",
        "non_profit",
    }
    actual_ids = {pack.pack_id for pack in FLAGSHIP_PACKS}

    assert len(FLAGSHIP_PACKS) == 6
    assert actual_ids == expected_ids

    catalog = get_pack_catalog()
    assert catalog["flagship_count"] == 6
    assert catalog["universal_custom_builder_supported"] is True


def test_health_status_payload() -> None:
    """Check health_status returns baseline Nigerian IFRS and pack counts."""
    payload = health_status(NairaBooksSettings())

    assert payload["status"] == "ok"
    assert payload["default_currency"] == "NGN"
    assert payload["vat_rate"] == "0.0750"
    assert payload["flagship_pack_count"] == 6
