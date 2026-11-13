"""Pure domain models, rule tables, and tax calculators for Nigerian taxation."""

from nairabooks.tax.domain.calculator import (
    MultiLayerIndirectTaxBreakdown,
    NrsTaxSubtotal,
    TaxAccountAllocation,
    TaxComputationPreview,
    TransactionDirection,
    calculate_multi_layer_indirect_tax,
    compute_tax_preview,
)
from nairabooks.tax.domain.models import (
    NigerianLegalForm,
    NigerianTaxProfile,
    SmallCompanyEvaluation,
    TaxRegimeType,
    TaxRuleVersion,
    ThresholdAlertLevel,
)
from nairabooks.tax.domain.rules import (
    DEFAULT_NIGERIAN_TAX_RULES,
    SMALL_COMPANY_ASSETS_CAP_NGN,
    SMALL_COMPANY_TURNOVER_CAP_NGN,
    WHT_SMALL_ENTITY_MONTHLY_TX_CAP_NGN,
    WHT_SMALL_ENTITY_TURNOVER_CAP_NGN,
    TaxRuleSet,
    evaluate_small_company_eligibility,
)

__all__ = [
    "DEFAULT_NIGERIAN_TAX_RULES",
    "SMALL_COMPANY_ASSETS_CAP_NGN",
    "SMALL_COMPANY_TURNOVER_CAP_NGN",
    "WHT_SMALL_ENTITY_MONTHLY_TX_CAP_NGN",
    "WHT_SMALL_ENTITY_TURNOVER_CAP_NGN",
    "MultiLayerIndirectTaxBreakdown",
    "NigerianLegalForm",
    "NigerianTaxProfile",
    "NrsTaxSubtotal",
    "SmallCompanyEvaluation",
    "TaxAccountAllocation",
    "TaxComputationPreview",
    "TaxRegimeType",
    "TaxRuleSet",
    "TaxRuleVersion",
    "ThresholdAlertLevel",
    "TransactionDirection",
    "calculate_multi_layer_indirect_tax",
    "compute_tax_preview",
    "evaluate_small_company_eligibility",
]
