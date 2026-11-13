"""Strict JSON parsing and schema.graphql camelCase serializers."""

from __future__ import annotations

import json
from decimal import Decimal

from nairabooks.audit.application import AuditEventConnection
from nairabooks.audit.domain import (
    AuditChainVerificationResult,
    AuditEvent,
    CamaSec405Certification,
    ImmutableAuditLogError,
)
from nairabooks.auth.application import SessionResult
from nairabooks.auth.domain import (
    ActorRole,
    AuthenticatedContext,
    AuthenticationError,
    AuthorizationError,
    RateLimitExceededError,
    UserAccount,
    Workspace,
    WorkspaceMember,
    permissions_for_role,
)
from nairabooks.ledger.application.use_cases import (
    JournalVoucherConnection,
    StandardTransactionPostingResult,
)
from nairabooks.ledger.domain import (
    BankReconciliationReport,
    ChartOfAccount,
    ClosedPeriodError,
    CrossTenantAccessError,
    FiscalPeriod,
    FrcnFinancialStatementPackage,
    FxRevaluationReport,
    ImmutableVoucherError,
    JournalLine,
    JournalVoucher,
    LedgerDomainError,
    Money,
    SegregationOfDutiesError,
    StatementLineItem,
    UnbalancedJournalError,
    ValidationError,
)
from nairabooks.packs.domain import (
    FlagshipPackPreset,
    PrimitiveCapabilitySpec,
    WorkspaceIndustryProfile,
)
from nairabooks.tax.domain import (
    MultiLayerIndirectTaxBreakdown,
    NigerianTaxProfile,
    NrsTaxSubtotal,
    SmallCompanyEvaluation,
    TaxComputationPreview,
    TaxRuleVersion,
)


def _reject_float(token: str) -> object:
    raise ValidationError(
        f"Numeric literal '{token}' is not permitted for monetary/rate fields; use strings.",
        field="json",
    )


def strict_json_loads(raw_body: bytes) -> dict[str, object]:
    """Decode UTF-8 JSON object while prohibiting float literals."""
    if not raw_body.strip():
        return {}
    try:
        parsed = json.loads(raw_body.decode("utf-8"), parse_float=_reject_float)
    except ValidationError:
        raise
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValidationError("Request body must be valid UTF-8 JSON.", field="body") from exc

    if not isinstance(parsed, dict):
        raise ValidationError("JSON payload must be an object.", field="body")
    return {str(k): v for k, v in parsed.items()}


def format_decimal(value: Decimal, decimals: int = 2) -> str:
    """Serialize Decimal cleanly as fixed-precision numeric string."""
    return f"{value:.{decimals}f}"


def serialize_money(money: Money) -> dict[str, object]:
    """Serialize MoneyAmount matching api/graphql/schema.graphql."""
    return {
        "amount": format_decimal(money.amount, 2),
        "currency": money.currency.value,
        "functionalAmountNgn": format_decimal(money.functional_amount_ngn, 2),
        "exchangeRateToNgn": format_decimal(money.exchange_rate_to_ngn, 6),
    }


def serialize_account(account: ChartOfAccount) -> dict[str, object]:
    """Serialize ChartOfAccount matching api/graphql/schema.graphql."""
    return {
        "id": str(account.id),
        "code": account.code,
        "name": account.name,
        "category": account.category.value,
        "ifrsTag": account.ifrs_tag,
        "sourcePrimitive": account.source_primitive,
        "isSystemLocked": account.is_system_locked,
        "isActive": account.is_active,
    }


def serialize_period(period: FiscalPeriod) -> dict[str, object]:
    """Serialize FiscalPeriod matching api/graphql/schema.graphql."""
    return {
        "id": str(period.id),
        "label": period.label,
        "startDate": period.start_date.isoformat(),
        "endDate": period.end_date.isoformat(),
        "status": period.status.value,
        "camaCertification": period.cama_certification,
    }


def serialize_line(line: JournalLine) -> dict[str, object]:
    """Serialize JournalLine matching api/graphql/schema.graphql."""
    return {
        "id": str(line.id),
        "accountId": str(line.account_id),
        "accountCode": line.account_code,
        "accountName": line.account_name,
        "debit": serialize_money(line.debit),
        "credit": serialize_money(line.credit),
        "fundOrDepartmentCode": line.fund_or_department_code,
        "projectOrSiteCode": line.project_or_site_code,
        "memo": line.memo,
    }


def serialize_voucher(voucher: JournalVoucher) -> dict[str, object]:
    """Serialize JournalVoucher matching api/graphql/schema.graphql."""
    return {
        "__typename": "JournalVoucher",
        "id": str(voucher.id),
        "voucherNumber": voucher.voucher_number,
        "postingDate": voucher.posting_date.isoformat(),
        "status": voucher.status.value,
        "reference": voucher.reference,
        "sourceModule": voucher.source_module,
        "lines": [serialize_line(line) for line in voucher.lines],
        "totalDebitNgn": format_decimal(voucher.total_debit_ngn, 2),
        "totalCreditNgn": format_decimal(voucher.total_credit_ngn, 2),
        "createdByUserId": str(voucher.created_by_user_id),
        "approvedByUserId": (
            str(voucher.approved_by_user_id) if voucher.approved_by_user_id else None
        ),
        "reversedByVoucherId": (
            str(voucher.reversed_by_voucher_id) if voucher.reversed_by_voucher_id else None
        ),
        "createdAt": voucher.created_at.isoformat(),
    }


def serialize_voucher_connection(conn: JournalVoucherConnection) -> dict[str, object]:
    """Serialize Relay JournalVoucherConnection."""
    return {
        "edges": [
            {"cursor": edge.cursor, "node": serialize_voucher(edge.node)}
            for edge in conn.edges
        ],
        "pageInfo": {
            "hasNextPage": conn.page_info.has_next_page,
            "hasPreviousPage": conn.page_info.has_previous_page,
            "startCursor": conn.page_info.start_cursor,
            "endCursor": conn.page_info.end_cursor,
        },
    }


def _serialize_statement_item(item: StatementLineItem) -> dict[str, object]:
    return {
        "accountCode": item.account_code,
        "accountName": item.account_name,
        "ifrsTag": item.ifrs_tag,
        "amountNgn": format_decimal(item.amount_ngn, 2),
    }


def serialize_frcn_package(pkg: FrcnFinancialStatementPackage) -> dict[str, object]:
    """Serialize FrcnFinancialStatementPackage matching schema.graphql."""
    return {
        "fiscalPeriodId": str(pkg.fiscal_period_id),
        "fiscalPeriodLabel": pkg.fiscal_period_label,
        "statementCurrency": pkg.statement_currency.value,
        "trialBalance": [
            {
                "accountCode": r.account_code,
                "accountName": r.account_name,
                "category": r.category.value,
                "ifrsTag": r.ifrs_tag,
                "debitBalanceNgn": format_decimal(r.debit_balance_ngn, 2),
                "creditBalanceNgn": format_decimal(r.credit_balance_ngn, 2),
            }
            for r in pkg.trial_balance.rows
        ],
        "totalDebitsNgn": format_decimal(pkg.trial_balance.total_debits_ngn, 2),
        "totalCreditsNgn": format_decimal(pkg.trial_balance.total_credits_ngn, 2),
        "profitAndLoss": {
            "revenueLines": [
                _serialize_statement_item(i) for i in pkg.profit_and_loss.revenue_lines
            ],
            "operatingExpenseLines": [
                _serialize_statement_item(i) for i in pkg.profit_and_loss.operating_expense_lines
            ],
            "taxExpenseLines": [
                _serialize_statement_item(i) for i in pkg.profit_and_loss.tax_expense_lines
            ],
            "totalRevenueNgn": format_decimal(pkg.profit_and_loss.total_revenue_ngn, 2),
            "operatingExpensesNgn": format_decimal(pkg.profit_and_loss.operating_expenses_ngn, 2),
            "profitBeforeTaxNgn": format_decimal(pkg.profit_and_loss.profit_before_tax_ngn, 2),
            "incomeTaxExpenseNgn": format_decimal(pkg.profit_and_loss.income_tax_expense_ngn, 2),
            "netProfitNgn": format_decimal(pkg.profit_and_loss.net_profit_ngn, 2),
        },
        "financialPosition": {
            "asOfDate": pkg.financial_position.as_of_date,
            "assetLines": [
                _serialize_statement_item(i) for i in pkg.financial_position.asset_lines
            ],
            "liabilityLines": [
                _serialize_statement_item(i) for i in pkg.financial_position.liability_lines
            ],
            "equityLines": [
                _serialize_statement_item(i) for i in pkg.financial_position.equity_lines
            ],
            "retainedAndCurrentEarningsNgn": format_decimal(
                pkg.financial_position.retained_and_current_earnings_ngn, 2
            ),
            "totalAssetsNgn": format_decimal(pkg.financial_position.total_assets_ngn, 2),
            "totalLiabilitiesNgn": format_decimal(pkg.financial_position.total_liabilities_ngn, 2),
            "totalEquityNgn": format_decimal(pkg.financial_position.total_equity_ngn, 2),
            "isBalanced": pkg.financial_position.is_balanced,
        },
        "valueAddedStatement": [
            {
                "lineLabel": r.line_label,
                "amountNgn": format_decimal(r.amount_ngn, 2),
                "percentageShare": format_decimal(r.percentage_share, 6),
            }
            for r in pkg.value_added_statement
        ],
        "fiveYearSummary": [
            {
                "fiscalYearLabel": col.fiscal_year_label,
                "revenueNgn": format_decimal(col.revenue_ngn, 2),
                "profitBeforeTaxNgn": format_decimal(col.profit_before_tax_ngn, 2),
                "totalAssetsNgn": format_decimal(col.total_assets_ngn, 2),
                "netEquityNgn": format_decimal(col.net_equity_ngn, 2),
            }
            for col in pkg.five_year_summary
        ],
        "isBalanced": pkg.is_balanced,
        "snapshotHash": pkg.snapshot_hash,
        "trialBalanceCsv": pkg.to_trial_balance_csv(),
        "generatedAt": pkg.generated_at.isoformat(),
    }


def serialize_bank_reconciliation(report: BankReconciliationReport) -> dict[str, object]:
    """Serialize BankReconciliationReport to camelCase JSON."""
    return {
        "accountId": str(report.account_id),
        "accountCode": report.account_code,
        "accountName": report.account_name,
        "matchedCount": report.matched_count,
        "matches": [
            {
                "statementLineId": m.statement_line_id,
                "voucherId": str(m.voucher_id),
                "voucherNumber": m.voucher_number,
                "status": m.status.value,
                "matchedAmountNgn": format_decimal(m.matched_amount_ngn, 2),
                "feeVarianceNgn": format_decimal(m.fee_variance_ngn, 2),
            }
            for m in report.matches
        ],
        "unmatchedStatementLines": [
            {
                "lineId": s.line_id,
                "valueDate": s.value_date.isoformat(),
                "amountNgn": format_decimal(s.amount_ngn, 2),
                "direction": s.direction,
                "channel": s.channel,
                "reference": s.reference,
                "feeNgn": format_decimal(s.fee_ngn, 2),
            }
            for s in report.unmatched_statement_lines
        ],
        "unmatchedLedgerLines": [
            {
                "voucherId": str(mv.voucher_id),
                "voucherNumber": mv.voucher_number,
                "postingDate": mv.posting_date.isoformat(),
                "reference": mv.reference,
                "direction": mv.direction,
                "amountNgn": format_decimal(mv.amount_ngn, 2),
            }
            for mv in report.unmatched_ledger_lines
        ],
        "statementNetNgn": format_decimal(report.statement_net_ngn, 2),
        "ledgerNetNgn": format_decimal(report.ledger_net_ngn, 2),
        "reconciliationDifferenceNgn": format_decimal(report.reconciliation_difference_ngn, 2),
    }


def serialize_fx_revaluation(report: FxRevaluationReport) -> dict[str, object]:
    """Serialize FxRevaluationReport to camelCase JSON."""
    return {
        "accountId": str(report.account_id),
        "accountCode": report.account_code,
        "accountName": report.account_name,
        "currency": report.currency.value,
        "asOfDate": report.as_of_date,
        "foreignBalance": format_decimal(report.foreign_balance, 2),
        "carryingNgn": format_decimal(report.carrying_ngn, 2),
        "closingRateToNgn": format_decimal(report.closing_rate_to_ngn, 6),
        "revaluedNgn": format_decimal(report.revalued_ngn, 2),
        "unrealizedGainLossNgn": format_decimal(report.unrealized_gain_loss_ngn, 2),
        "isGain": report.is_gain,
    }


def serialize_tax_profile(profile: NigerianTaxProfile) -> dict[str, object]:
    """Serialize NigerianTaxProfile matching api/graphql/schema.graphql."""
    return {
        "id": str(profile.id),
        "workspaceId": str(profile.workspace_id),
        "legalForm": profile.legal_form.value,
        "tinNumber": profile.tin_number,
        "vatRegistered": profile.vat_registered,
        "annualTurnoverNgn": format_decimal(profile.annual_turnover_ngn, 2),
        "fixedAssetsNgn": format_decimal(profile.fixed_assets_ngn, 2),
        "stateOfOperation": profile.state_of_operation,
        "isProfessionalServices": profile.is_professional_services,
        "isProfessionalServicesExcludedFromSmallExempt": (
            profile.is_professional_services_excluded_from_small_exempt
        ),
        "isSmallBusinessCitExempt": profile.is_small_business_cit_exempt,
        "effectiveFrom": profile.effective_from.isoformat(),
    }


def serialize_small_company_evaluation(evaluation: SmallCompanyEvaluation) -> dict[str, object]:
    """Serialize SmallCompanyEvaluation for Tax Act 2025 threshold radar."""
    return {
        "eligibleForZeroCit": evaluation.eligible_for_zero_cit,
        "applicableCitRate": format_decimal(evaluation.applicable_cit_rate, 6),
        "ruleVersionCode": evaluation.rule_version_code,
        "reason": evaluation.reason,
        "statutoryCitation": evaluation.statutory_citation,
        "thresholdAlertLevel": evaluation.threshold_alert_level.value,
        "turnoverUtilizationPct": format_decimal(evaluation.turnover_utilization_pct, 2),
        "assetUtilizationPct": format_decimal(evaluation.asset_utilization_pct, 2),
    }


def serialize_tax_rule_version(rule: TaxRuleVersion) -> dict[str, object]:
    """Serialize statutory TaxRuleVersion row cleanly."""
    return {
        "ruleVersionCode": rule.rule_version_code,
        "regime": rule.regime.value,
        "jurisdiction": rule.jurisdiction,
        "supplyCategoryCode": rule.supply_category_code,
        "standardRate": format_decimal(rule.standard_rate, 6),
        "noTinPenaltyRate": (
            format_decimal(rule.no_tin_penalty_rate, 6)
            if rule.no_tin_penalty_rate is not None
            else None
        ),
        "effectiveFrom": rule.effective_from.isoformat(),
        "effectiveTo": rule.effective_to.isoformat() if rule.effective_to else None,
        "statutoryCitation": rule.statutory_citation,
        "vatNrsCategoryCode": rule.vat_nrs_category_code,
        "description": rule.description,
    }


def serialize_nrs_subtotal(sub: NrsTaxSubtotal) -> dict[str, object]:
    """Serialize NRS e-invoice TaxSubtotal breakdown."""
    return {
        "taxSchemeId": sub.tax_scheme_id,
        "categoryCode": sub.category_code,
        "taxableAmountNgn": format_decimal(sub.taxable_amount_ngn, 2),
        "taxRate": format_decimal(sub.tax_rate, 6),
        "taxAmountNgn": format_decimal(sub.tax_amount_ngn, 2),
        "statutoryCitation": sub.statutory_citation,
        "ruleVersionCode": sub.rule_version_code,
    }


def serialize_tax_preview(preview: TaxComputationPreview) -> dict[str, object]:
    """Serialize TaxComputationPreview matching schema.graphql."""
    return {
        "effectiveDate": preview.effective_date.isoformat(),
        "regime": preview.regime.value,
        "ruleVersionCode": preview.rule_version_code,
        "supplyCategoryCode": preview.supply_category_code,
        "taxableBaseNgn": format_decimal(preview.taxable_base_ngn, 2),
        "appliedRate": format_decimal(preview.applied_rate, 6),
        "computedTaxNgn": format_decimal(preview.computed_tax_ngn, 2),
        "vatNrsCategoryCode": preview.vat_nrs_category_code,
        "whtHigherNoTinApplied": preview.wht_higher_no_tin_applied,
        "whtExemptSmallEntityApplied": preview.wht_exempt_small_entity_applied,
        "statutoryCitation": preview.statutory_citation,
        "nrsSubtotals": [serialize_nrs_subtotal(s) for s in preview.nrs_subtotals],
    }


def serialize_multilayer_indirect_tax(
    breakdown: MultiLayerIndirectTaxBreakdown,
) -> dict[str, object]:
    """Serialize MultiLayerIndirectTaxBreakdown for VAT + State + Service Charge + WHT."""
    return {
        "effectiveDate": breakdown.effective_date.isoformat(),
        "jurisdiction": breakdown.jurisdiction,
        "baseAmountNgn": format_decimal(breakdown.base_amount_ngn, 2),
        "vatAmountNgn": format_decimal(breakdown.vat_amount_ngn, 2),
        "stateConsumptionTaxNgn": format_decimal(breakdown.state_consumption_tax_ngn, 2),
        "serviceChargeNgn": format_decimal(breakdown.service_charge_ngn, 2),
        "whtDeductionNgn": format_decimal(breakdown.wht_deduction_ngn, 2),
        "grossCustomerInvoiceNgn": format_decimal(breakdown.gross_customer_invoice_ngn, 2),
        "netCashPayableNgn": format_decimal(breakdown.net_cash_payable_ngn, 2),
        "vatNrsCategoryCode": breakdown.vat_nrs_category_code,
        "whtHigherNoTinApplied": breakdown.wht_higher_no_tin_applied,
        "whtExemptSmallEntityApplied": breakdown.wht_exempt_small_entity_applied,
        "accountPostings": [
            {
                "accountCode": item.account_code,
                "accountName": item.account_name,
                "side": item.side,
                "taxSchemeId": item.tax_scheme_id,
                "amountNgn": format_decimal(item.amount_ngn, 2),
            }
            for item in breakdown.account_postings
        ],
        "nrsSubtotals": [serialize_nrs_subtotal(s) for s in breakdown.nrs_subtotals],
    }


def serialize_primitive_capability(spec: PrimitiveCapabilitySpec) -> dict[str, object]:
    """Serialize one of the 10 reusable OperationalPrimitive catalog descriptors."""
    return {
        "primitive": spec.primitive.value,
        "displayName": spec.display_name,
        "plainEnglishSummary": spec.plain_english_summary,
        "accounts": [
            {
                "code": acct.code,
                "name": acct.name,
                "category": acct.category.value,
                "ifrsTag": acct.ifrs_tag,
                "sourcePrimitive": acct.source_primitive.value,
                "isSystemLocked": acct.is_system_locked,
            }
            for acct in spec.accounts
        ],
        "dimensions": [
            {
                "key": dim.key,
                "label": dim.label,
                "required": dim.required,
            }
            for dim in spec.dimensions
        ],
        "kpis": [
            {
                "key": kpi.key,
                "label": kpi.label,
                "formulaPlainEnglish": kpi.formula_plain_english,
            }
            for kpi in spec.kpis
        ],
        "vocabularyDefaults": dict(spec.vocabulary_defaults),
        "taxHints": {
            "vatRegistered": spec.tax_hints.vat_registered,
            "defaultVatRegime": spec.tax_hints.default_vat_regime.value,
            "isProfessionalServices": spec.tax_hints.is_professional_services,
            "includeStateConsumptionTax": spec.tax_hints.include_state_consumption_tax,
            "defaultServiceChargeRate": spec.tax_hints.default_service_charge_rate,
            "defaultWhtCategory": spec.tax_hints.default_wht_category,
        },
    }


def serialize_workspace_industry_profile(
    profile: WorkspaceIndustryProfile,
) -> dict[str, object]:
    """Serialize WorkspaceIndustryProfile matching api/graphql/schema.graphql."""
    return {
        "id": str(profile.id),
        "workspaceId": str(profile.workspace_id),
        "primaryPack": profile.primary_pack.value,
        "isHybridMultiUnit": profile.is_hybrid_multi_unit,
        "activePrimitives": [
            {
                "primitive": desc.primitive.value,
                "enabled": desc.enabled,
                "customLabels": dict(desc.custom_labels),
            }
            for desc in profile.active_primitives
        ],
        "kpiWidgets": list(profile.kpi_widgets),
        "terminologyMap": dict(profile.terminology_map),
        "dimensions": [
            {
                "key": dim.key,
                "label": dim.label,
                "required": dim.required,
            }
            for dim in profile.dimensions
        ],
        "taxDefaults": {
            "vatRegistered": profile.tax_defaults.vat_registered,
            "defaultVatRegime": profile.tax_defaults.default_vat_regime.value,
            "isProfessionalServices": profile.tax_defaults.is_professional_services,
            "includeStateConsumptionTax": profile.tax_defaults.include_state_consumption_tax,
            "defaultServiceChargeRate": profile.tax_defaults.default_service_charge_rate,
            "defaultWhtCategory": profile.tax_defaults.default_wht_category,
        },
        "coaAccounts": [
            {
                "code": acct.code,
                "name": acct.name,
                "category": acct.category.value,
                "ifrsTag": acct.ifrs_tag,
                "sourcePrimitive": acct.source_primitive.value,
                "isSystemLocked": acct.is_system_locked,
            }
            for acct in profile.coa_accounts
        ],
        "updatedAt": profile.updated_at.isoformat(),
    }


def serialize_flagship_pack_preset(preset: FlagshipPackPreset) -> dict[str, object]:
    """Serialize one of the 6 Nigerian Flagship Reference Pack presets."""
    return {
        "packCode": preset.pack_code.value,
        "title": preset.title,
        "plainEnglishSummary": preset.plain_english_summary,
        "targetSectors": list(preset.target_sectors),
        "recommendedPrimitives": [p.value for p in preset.recommended_primitives],
        "terminologyDefaults": dict(preset.terminology_defaults),
        "taxHighlights": list(preset.tax_highlights),
        "phaseStatus": preset.phase_status,
    }


def serialize_auth_context(
    ctx: AuthenticatedContext,
    workspace: Workspace,
    available_workspaces: tuple[tuple[Workspace, ActorRole], ...],
) -> dict[str, object]:
    """Serialize authenticated actor, active tenant workspace, and RBAC permissions."""
    perms = sorted(p.value for p in permissions_for_role(ctx.role))
    return {
        "user": {
            "id": str(ctx.user_id),
            "email": ctx.email,
            "fullName": ctx.full_name,
        },
        "workspace": {
            "id": str(workspace.id),
            "name": workspace.name,
            "slug": workspace.slug,
            "baseCurrency": workspace.base_currency,
        },
        "role": ctx.role.value,
        "permissions": perms,
        "sessionId": str(ctx.session_id),
        "authMethod": ctx.auth_method,
        "availableWorkspaces": [
            {
                "id": str(ws.id),
                "name": ws.name,
                "slug": ws.slug,
                "role": role.value,
            }
            for ws, role in available_workspaces
        ],
    }


def serialize_auth_session(session: SessionResult) -> dict[str, object]:
    """Serialize login/refresh/switch session response without exposing password hashes."""
    payload = serialize_auth_context(
        session.context,
        session.workspace,
        session.available_workspaces,
    )
    payload.update(
        {
            "accessToken": session.access_token,
            "refreshToken": session.refresh_token,
            "accessExpiresAt": session.access_expires_at.isoformat(),
            "refreshExpiresAt": session.refresh_expires_at.isoformat(),
        }
    )
    return payload


def serialize_workspace_member(
    member: WorkspaceMember,
    user: UserAccount,
) -> dict[str, object]:
    """Serialize tenant-scoped workspace member & role."""
    return {
        "id": str(member.id),
        "workspaceId": str(member.workspace_id),
        "userId": str(user.id),
        "email": user.email,
        "fullName": user.full_name,
        "role": member.role.value,
        "isActive": member.is_active and user.is_active,
        "createdAt": member.created_at.isoformat(),
    }


def serialize_audit_event(event: AuditEvent) -> dict[str, object]:
    """Serialize AuditEvent matching api/graphql/schema.graphql."""
    return {
        "id": str(event.id),
        "sequenceNumber": event.sequence_number,
        "actorUserId": str(event.actor_user_id),
        "actorRole": event.actor_role.value,
        "action": event.action,
        "entityType": event.entity_type,
        "entityId": str(event.entity_id),
        "payloadHash": event.payload_hash,
        "previousEventHash": event.previous_event_hash,
        "eventHash": event.event_hash,
        "occurredAt": event.occurred_at.isoformat(),
    }


def serialize_audit_event_connection(conn: AuditEventConnection) -> dict[str, object]:
    """Serialize Relay AuditEventConnection matching api/graphql/schema.graphql."""
    return {
        "edges": [
            {"cursor": edge.cursor, "node": serialize_audit_event(edge.node)}
            for edge in conn.edges
        ],
        "pageInfo": {
            "hasNextPage": conn.page_info.has_next_page,
            "hasPreviousPage": conn.page_info.has_previous_page,
            "startCursor": conn.page_info.start_cursor,
            "endCursor": conn.page_info.end_cursor,
        },
        "totalCount": conn.total_count,
    }


def serialize_audit_verification(res: AuditChainVerificationResult) -> dict[str, object]:
    """Serialize SHA-256 hash chain integrity report."""
    return {
        "isValid": res.is_valid,
        "eventCount": res.event_count,
        "latestEventHash": res.latest_event_hash,
        "brokenAtSequence": res.broken_at_sequence,
        "reason": res.reason,
    }


def serialize_cama_certification(cert: CamaSec405Certification) -> dict[str, object]:
    """Serialize CamaSec405Certification matching api/graphql/schema.graphql."""
    return {
        "id": str(cert.id),
        "workspaceId": str(cert.workspace_id),
        "fiscalPeriodId": str(cert.fiscal_period_id),
        "certifiedByUserId": str(cert.certified_by_user_id),
        "certifiedByName": cert.certified_by_name,
        "professionalBody": cert.professional_body.value,
        "frcRegNumber": cert.frc_reg_number,
        "statementSnapshotHash": cert.statement_snapshot_hash,
        "certifiedAt": cert.certified_at.isoformat(),
    }


def serialize_standard_transaction_result(
    res: StandardTransactionPostingResult,
) -> dict[str, object]:
    """Serialize the outcome of posting a standard operational transaction."""
    return {
        "ok": True,
        "voucherId": str(res.voucher_id),
        "voucherNumber": res.voucher_number,
        "reference": res.reference,
        "transactionType": res.transaction_type,
        "counterparty": res.counterparty,
        "postingDate": res.posting_date.isoformat(),
        "totalDebitNgn": format_decimal(res.total_debit_ngn, 2),
        "totalCreditNgn": format_decimal(res.total_credit_ngn, 2),
        "linesCount": res.lines_count,
    }


def serialize_domain_error(exc: LedgerDomainError) -> tuple[int, dict[str, object]]:
    """Map domain errors to HTTP status codes and schema.graphql MutationError shapes."""
    if isinstance(exc, AuthenticationError):
        return 401, {
            "__typename": "ValidationError",
            "code": exc.code,
            "message": exc.message,
            "field": "authorization",
        }
    if isinstance(exc, AuthorizationError):
        return 403, {
            "__typename": "ValidationError",
            "code": exc.code,
            "message": exc.message,
            "field": "role",
            "requiredRoles": list(exc.required_roles),
            "actorRole": exc.actor_role,
        }
    if isinstance(exc, RateLimitExceededError):
        return 429, {
            "__typename": "ValidationError",
            "code": exc.code,
            "message": exc.message,
            "field": "email",
            "retryAfterSeconds": exc.retry_after_seconds,
        }
    if isinstance(exc, ImmutableAuditLogError):
        return 422, {
            "__typename": "ValidationError",
            "code": exc.code,
            "message": exc.message,
            "field": None,
        }
    if isinstance(exc, UnbalancedJournalError):
        return 422, {
            "__typename": "UnbalancedJournalError",
            "code": exc.code,
            "message": exc.message,
            "totalDebitNgn": format_decimal(exc.total_debit_ngn, 2),
            "totalCreditNgn": format_decimal(exc.total_credit_ngn, 2),
        }
    if isinstance(exc, ClosedPeriodError):
        return 422, {
            "__typename": "ClosedPeriodError",
            "code": exc.code,
            "message": exc.message,
            "periodLabel": exc.period_label,
            "periodStatus": exc.period_status,
        }
    if isinstance(exc, CrossTenantAccessError):
        return 403, {
            "__typename": "CrossTenantAccessError",
            "code": exc.code,
            "message": exc.message,
        }
    if isinstance(exc, SegregationOfDutiesError):
        return 403, {
            "__typename": "SegregationOfDutiesError",
            "code": exc.code,
            "message": exc.message,
            "field": "approvedByUserId",
            "requiredRole": ActorRole.CHARTERED_ACCOUNTANT_CFO.value,
        }
    if isinstance(exc, ImmutableVoucherError):
        return 422, {
            "__typename": "ValidationError",
            "code": exc.code,
            "message": exc.message,
            "field": "originalVoucherId",
        }
    if isinstance(exc, ValidationError):
        return 400, {
            "__typename": "ValidationError",
            "code": exc.code,
            "message": exc.message,
            "field": exc.field,
        }
    return 400, {
        "__typename": "ValidationError",
        "code": exc.code,
        "message": exc.message,
        "field": None,
    }
