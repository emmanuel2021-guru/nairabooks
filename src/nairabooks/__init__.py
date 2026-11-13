"""NairaBooks core package: Nigerian-first IFRS ledger and composable industry packs."""

from nairabooks.config import NairaBooksSettings, get_settings
from nairabooks.main import (
    FLAGSHIP_PACKS,
    FlagshipPackSummary,
    get_pack_catalog,
    health_status,
)

__all__ = [
    "FLAGSHIP_PACKS",
    "FlagshipPackSummary",
    "NairaBooksSettings",
    "__version__",
    "get_pack_catalog",
    "get_settings",
    "health_status",
]

__version__ = "0.1.0"
