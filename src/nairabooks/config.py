"""Environment-driven settings for NairaBooks with Decimal-safe monetary defaults."""

from __future__ import annotations

from decimal import Decimal
from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class NairaBooksSettings(BaseSettings):
    """Application settings loaded from ``NAIRABOOKS_`` environment variables."""

    model_config = SettingsConfigDict(
        env_prefix="NAIRABOOKS_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "NairaBooks"
    env: Literal["development", "staging", "production"] = "development"
    default_currency: str = Field(default="NGN", min_length=3, max_length=3)
    decimal_places: int = Field(default=2, ge=2, le=6)
    default_vat_rate: Decimal = Field(default=Decimal("0.0750"))
    small_business_turnover_limit_ngn: Decimal = Field(default=Decimal("100000000.00"))
    ifrs_standard: str = "IFRS for SMEs + FRCN Other National Disclosures"


@lru_cache(maxsize=1)
def get_settings() -> NairaBooksSettings:
    """Return cached application settings instance."""
    return NairaBooksSettings()
