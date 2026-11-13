"""Transport-agnostic HTTP + GraphQL request dispatcher for NairaBooks Slice 1."""

from __future__ import annotations

import re
from collections.abc import Mapping
from datetime import date
from decimal import Decimal
from urllib.parse import parse_qs, urlsplit
from uuid import UUID, uuid4

from nairabooks.api.graphql_guards import validate_graphql_query
from nairabooks.api.serializers import (
    serialize_account,
    serialize_audit_event_connection,
    serialize_audit_verification,
    serialize_auth_context,
    serialize_auth_session,
    serialize_bank_reconciliation,
    serialize_cama_certification,
    serialize_domain_error,
    serialize_flagship_pack_preset,
    serialize_frcn_package,
    serialize_fx_revaluation,
    serialize_multilayer_indirect_tax,
    serialize_period,
    serialize_primitive_capability,
    serialize_small_company_evaluation,
    serialize_standard_transaction_result,
    serialize_tax_preview,
    serialize_tax_profile,
    serialize_tax_rule_version,
    serialize_voucher,
    serialize_voucher_connection,
    serialize_workspace_industry_profile,
    serialize_workspace_member,
    strict_json_loads,
)
from nairabooks.audit.adapters.in_memory import InMemoryAuditStore
from nairabooks.audit.application import (
    AuditStore,
    CertifyCamaSec405Command,
    CertifyCamaSec405UseCase,
    ListAuditEventsUseCase,
    RecordAuditEventCommand,
    RecordAuditEventUseCase,
    VerifyAuditChainUseCase,
)
from nairabooks.audit.domain import CamaSec405Certification, ProfessionalBody
from nairabooks.auth.adapters.in_memory import create_seeded_demo_auth_store
from nairabooks.auth.application import (
    AssignMemberRoleCommand,
    AuthStore,
    LoginCommand,
    LoginUseCase,
    LogoutUseCase,
    ManageWorkspaceMemberUseCase,
    RefreshSessionUseCase,
    ResolveAuthContextUseCase,
    SessionResult,
    SwitchWorkspaceUseCase,
)
from nairabooks.auth.domain import (
    ActorRole,
    AuthenticatedContext,
    AuthenticationError,
    Permission,
    TokenService,
    Workspace,
    require_permission,
)
from nairabooks.config import get_settings
from nairabooks.ledger.application import (
    CalculateFxRevaluationUseCase,
    GenerateFrcnPackageUseCase,
    LedgerStore,
    ListChartOfAccountsUseCase,
    ListFiscalPeriodsUseCase,
    ListJournalVouchersUseCase,
    PostJournalVoucherCommand,
    PostJournalVoucherUseCase,
    PostStandardTransactionCommand,
    PostStandardTransactionUseCase,
    ReconcileBankStatementUseCase,
    ReverseJournalVoucherCommand,
    ReverseJournalVoucherUseCase,
    StandardTransactionLineItemInput,
    StandardTransactionPostingResult,
)
from nairabooks.ledger.domain import (
    AccountCategory,
    BankStatementLine,
    CurrencyCode,
    FiscalPeriod,
    JournalLineInput,
    JournalVoucher,
    LedgerDomainError,
    ValidationError,
    VoucherStatus,
)
from nairabooks.ledger.domain.money import MONEY_QUANTUM, MoneyInput, parse_decimal
from nairabooks.packs.adapters.in_memory import InMemoryPackStore
from nairabooks.packs.application import (
    ApplyFlagshipPackCommand,
    ApplyFlagshipPackUseCase,
    ComposeCustomPackCommand,
    ComposeCustomPackPreviewUseCase,
    ConfigureIndustryPackCommand,
    ConfigureIndustryPackUseCase,
    GetWorkspacePackProfileUseCase,
    IndustryPackStore,
    ListFlagshipPacksUseCase,
    ListPrimitiveCapabilitiesUseCase,
    PostPackOperationCommand,
    PostPackOperationUseCase,
    normalize_primitives,
)
from nairabooks.packs.domain import (
    FlagshipPackCode,
    OperationalPrimitive,
    PackOperationType,
    WorkspaceIndustryProfile,
)
from nairabooks.tax.adapters.in_memory import InMemoryTaxStore
from nairabooks.tax.application import (
    CalculateMultiLayerIndirectTaxCommand,
    CalculateMultiLayerIndirectTaxUseCase,
    GetTaxProfileUseCase,
    ListTaxRulesUseCase,
    PreviewNigerianTaxCommand,
    PreviewNigerianTaxUseCase,
    TaxProfileStore,
    UpdateTaxProfileCommand,
    UpdateTaxProfileUseCase,
)
from nairabooks.tax.domain import (
    MultiLayerIndirectTaxBreakdown,
    NigerianLegalForm,
    NigerianTaxProfile,
    SmallCompanyEvaluation,
    TaxComputationPreview,
    TaxRegimeType,
    TransactionDirection,
)


def _parse_uuid(value: object, *, field: str) -> UUID:
    if not isinstance(value, str):
        raise ValidationError(f"Field '{field}' must be a UUID string.", field=field)
    try:
        return UUID(value)
    except ValueError as exc:
        raise ValidationError(f"Field '{field}' is not a valid UUID.", field=field) from exc


def _parse_date(value: object, *, field: str) -> date:
    if not isinstance(value, str):
        raise ValidationError(f"Field '{field}' must be an ISO date string.", field=field)
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValidationError(f"Field '{field}' must use YYYY-MM-DD format.", field=field) from exc


def _parse_str(value: object, *, field: str) -> str:
    if not isinstance(value, str):
        raise ValidationError(f"Field '{field}' must be a string.", field=field)
    return value


def _parse_optional_str(value: object, *, field: str) -> str | None:
    if value is None:
        return None
    return _parse_str(value, field=field)


def _parse_money_input(value: object, *, field: str) -> MoneyInput:
    if isinstance(value, bool) or isinstance(value, float) or not isinstance(value, int | str):
        raise ValidationError(
            f"Field '{field}' must be a fixed decimal string.",
            field=field,
        )
    return value


def _parse_bool(value: object, *, field: str) -> bool:
    if not isinstance(value, bool):
        raise ValidationError(f"Field '{field}' must be a boolean.", field=field)
    return value


def _default_tax_store() -> InMemoryTaxStore:
    store = InMemoryTaxStore()
    store.seed_default_workspace(UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001"))
    return store


def _default_pack_store() -> InMemoryPackStore:
    store = InMemoryPackStore()
    store.seed_default_workspace(UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001"))
    return store


class LedgerApiApplication:
    """Executes REST BFF routes and GraphQL operations against the ledger bounded context."""

    def __init__(
        self,
        store: LedgerStore,
        tax_store: TaxProfileStore | None = None,
        pack_store: IndustryPackStore | None = None,
        auth_store: AuthStore | None = None,
        audit_store: AuditStore | None = None,
        token_service: TokenService | None = None,
        require_auth: bool = False,
    ) -> None:
        self._store = store
        self._tax_store: TaxProfileStore = tax_store or _default_tax_store()
        self._pack_store: IndustryPackStore = pack_store or _default_pack_store()
        self._explicit_auth_store = auth_store is not None
        if auth_store is not None:
            self._auth_store: AuthStore = auth_store
        else:
            default_auth, _ = create_seeded_demo_auth_store()
            self._auth_store = default_auth
        self._audit_store: AuditStore = audit_store or InMemoryAuditStore()
        self._token_service: TokenService = token_service or TokenService()
        self._require_auth = require_auth
        self._login_uc = LoginUseCase(store=self._auth_store, token_service=self._token_service)
        self._refresh_uc = RefreshSessionUseCase(
            store=self._auth_store, token_service=self._token_service
        )
        self._logout_uc = LogoutUseCase(
            store=self._auth_store, token_service=self._token_service
        )
        self._resolve_auth_uc = ResolveAuthContextUseCase(
            store=self._auth_store, token_service=self._token_service
        )
        self._switch_ws_uc = SwitchWorkspaceUseCase(
            store=self._auth_store, token_service=self._token_service
        )
        self._members_uc = ManageWorkspaceMemberUseCase(store=self._auth_store)
        self._record_audit_uc = RecordAuditEventUseCase(self._audit_store)
        self._list_audit_uc = ListAuditEventsUseCase(self._audit_store)
        self._verify_audit_uc = VerifyAuditChainUseCase(self._audit_store)
        self._certify_cama_uc = CertifyCamaSec405UseCase(
            ledger_store=store,
            audit_store=self._audit_store,
        )
        self._post_uc = PostJournalVoucherUseCase(store)
        self._post_std_tx_uc = PostStandardTransactionUseCase(
            store=store, post_voucher_uc=self._post_uc
        )
        self._reverse_uc = ReverseJournalVoucherUseCase(store)
        self._list_accounts_uc = ListChartOfAccountsUseCase(store)
        self._list_periods_uc = ListFiscalPeriodsUseCase(store)
        self._list_vouchers_uc = ListJournalVouchersUseCase(store)
        self._frcn_uc = GenerateFrcnPackageUseCase(store)
        self._reconcile_uc = ReconcileBankStatementUseCase(store)
        self._fx_reval_uc = CalculateFxRevaluationUseCase(store)
        self._get_tax_profile_uc = GetTaxProfileUseCase(self._tax_store)
        self._update_tax_profile_uc = UpdateTaxProfileUseCase(self._tax_store)
        self._list_tax_rules_uc = ListTaxRulesUseCase(self._tax_store)
        self._preview_tax_uc = PreviewNigerianTaxUseCase(self._tax_store)
        self._indirect_tax_uc = CalculateMultiLayerIndirectTaxUseCase(self._tax_store)
        self._list_primitives_uc = ListPrimitiveCapabilitiesUseCase()
        self._list_flagships_uc = ListFlagshipPacksUseCase()
        self._apply_flagship_uc = ApplyFlagshipPackUseCase(
            pack_store=self._pack_store,
            ledger_store=store,
        )
        self._post_pack_op_uc = PostPackOperationUseCase(store)
        self._get_pack_profile_uc = GetWorkspacePackProfileUseCase(self._pack_store)
        self._compose_pack_preview_uc = ComposeCustomPackPreviewUseCase()
        self._configure_pack_uc = ConfigureIndustryPackUseCase(
            pack_store=self._pack_store,
            ledger_store=store,
        )

    def handle_request(
        self,
        *,
        method: str,
        path: str,
        headers: Mapping[str, str],
        body: bytes = b"",
    ) -> tuple[int, dict[str, object]]:
        """Dispatch an HTTP request and return (status_code, json_payload)."""
        status, _, payload = self.handle_request_with_headers(
            method=method,
            path=path,
            headers=headers,
            body=body,
        )
        return status, payload

    def handle_request_with_headers(
        self,
        *,
        method: str,
        path: str,
        headers: Mapping[str, str],
        body: bytes = b"",
    ) -> tuple[int, list[tuple[str, str]], dict[str, object]]:
        """Dispatch an HTTP request and return (status_code, response_headers, json_payload)."""
        parsed_url = urlsplit(path)
        route = parsed_url.path
        upper_method = method.upper()
        ip_address, user_agent = self._extract_client_meta(headers)

        if upper_method == "GET" and route in ("/health", "/", "/api/v1/health"):
            return 200, [], {"status": "ok", "service": "nairabooks-ledger-api"}

        try:
            if upper_method == "POST" and route == "/api/v1/auth/login":
                payload = strict_json_loads(body)
                email = _parse_str(payload.get("email"), field="email")
                password = _parse_str(payload.get("password"), field="password")
                ws_raw = payload.get("workspaceId")
                target_ws = _parse_uuid(ws_raw, field="workspaceId") if ws_raw is not None else None
                session = self._login_uc.execute(
                    LoginCommand(
                        email=email,
                        password=password,
                        workspace_id=target_ws,
                        ip_address=ip_address,
                    )
                )
                self._record_audit(
                    session.context,
                    action="AUTH_LOGIN_SUCCEEDED",
                    entity_type="AuthSession",
                    entity_id=session.context.session_id,
                    payload={"email": session.context.email, "role": session.context.role.value},
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return 200, self._session_cookie_headers(session), serialize_auth_session(session)

            if upper_method == "POST" and route == "/api/v1/auth/refresh":
                payload = strict_json_loads(body)
                cookies = self._parse_cookies(headers)
                raw_refresh = payload.get("refreshToken") or cookies.get("nb_refresh_token")
                refresh_token = _parse_str(raw_refresh, field="refreshToken")
                session = self._refresh_uc.execute(refresh_token)
                self._record_audit(
                    session.context,
                    action="AUTH_TOKEN_REFRESHED",
                    entity_type="AuthSession",
                    entity_id=session.context.session_id,
                    payload={"role": session.context.role.value},
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return 200, self._session_cookie_headers(session), serialize_auth_session(session)

            if upper_method == "POST" and route == "/api/v1/auth/logout":
                payload = strict_json_loads(body)
                cookies = self._parse_cookies(headers)
                raw_refresh = payload.get("refreshToken") or cookies.get("nb_refresh_token")
                if isinstance(raw_refresh, str) and raw_refresh.strip():
                    self._logout_uc.execute(raw_refresh)
                return 200, self._clear_cookie_headers(), {"ok": True}

            ctx = self._extract_auth_context(headers)
            workspace_id = ctx.workspace_id
            actor_user_id = ctx.user_id

            if upper_method == "GET" and route == "/api/v1/auth/session":
                ws = self._auth_store.find_workspace(workspace_id) or Workspace(
                    id=workspace_id,
                    name="Active Workspace",
                    slug="active-workspace",
                )
                memberships = self._auth_store.list_workspaces_for_user(actor_user_id)
                return (
                    200,
                    [],
                    serialize_auth_context(
                        ctx,
                        ws,
                        tuple((w, m.role) for w, m in memberships) or ((ws, ctx.role),),
                    ),
                )

            if upper_method == "POST" and route == "/api/v1/auth/switch-workspace":
                payload = strict_json_loads(body)
                target_ws = _parse_uuid(payload.get("workspaceId"), field="workspaceId")
                session = self._switch_ws_uc.execute(ctx=ctx, target_workspace_id=target_ws)
                self._record_audit(
                    session.context,
                    action="AUTH_WORKSPACE_SWITCHED",
                    entity_type="Workspace",
                    entity_id=target_ws,
                    payload={"targetWorkspaceId": str(target_ws)},
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return 200, self._session_cookie_headers(session), serialize_auth_session(session)

            if upper_method == "GET" and route == "/api/v1/auth/members":
                members = self._members_uc.list_members(actor=ctx)
                return 200, [], {"items": [serialize_workspace_member(m, u) for m, u in members]}

            if upper_method == "POST" and route == "/api/v1/auth/members":
                payload = strict_json_loads(body)
                role_raw = _parse_str(payload.get("role"), field="role")
                try:
                    role = ActorRole(role_raw)
                except ValueError as exc:
                    raise ValidationError(f"Unknown ActorRole '{role_raw}'.", field="role") from exc
                member, user = self._members_uc.assign_member(
                    AssignMemberRoleCommand(
                        actor=ctx,
                        email=_parse_str(payload.get("email"), field="email"),
                        full_name=_parse_str(payload.get("fullName", ""), field="fullName"),
                        role=role,
                        password=_parse_optional_str(payload.get("password"), field="password"),
                    )
                )
                self._record_audit(
                    ctx,
                    action="MEMBER_ROLE_UPDATED",
                    entity_type="WorkspaceMember",
                    entity_id=member.id,
                    payload={"targetUserId": str(user.id), "role": member.role.value},
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return 201, [], serialize_workspace_member(member, user)

            if upper_method == "POST" and route == "/graphql":
                payload = strict_json_loads(body)
                return (
                    200,
                    [],
                    self._handle_graphql(
                        ctx,
                        payload,
                        ip_address=ip_address,
                        user_agent=user_agent,
                    ),
                )

            if upper_method == "GET" and route == "/api/v1/ledger/accounts":
                require_permission(ctx, Permission.LEDGER_READ)
                qs = parse_qs(parsed_url.query)
                category_raw = qs.get("category", [None])[0]
                category = AccountCategory(category_raw) if category_raw else None
                active_only = qs.get("activeOnly", ["true"])[0].lower() != "false"
                accounts = self._list_accounts_uc.execute(
                    workspace_id=workspace_id,
                    category=category,
                    active_only=active_only,
                )
                return 200, [], {"items": [serialize_account(acct) for acct in accounts]}

            if upper_method == "GET" and route == "/api/v1/ledger/periods":
                require_permission(ctx, Permission.LEDGER_READ)
                periods = self._list_periods_uc.execute(workspace_id=workspace_id)
                return 200, [], {"items": [serialize_period(period) for period in periods]}

            if upper_method == "GET" and route == "/api/v1/ledger/vouchers":
                require_permission(ctx, Permission.LEDGER_READ)
                qs = parse_qs(parsed_url.query)
                first = int(qs.get("first", ["25"])[0])
                after = qs.get("after", [None])[0]
                status_raw = qs.get("status", [None])[0]
                status = VoucherStatus(status_raw) if status_raw else None
                from_raw = qs.get("fromDate", [None])[0]
                to_raw = qs.get("toDate", [None])[0]
                conn = self._list_vouchers_uc.execute(
                    workspace_id=workspace_id,
                    first=first,
                    after=after,
                    status=status,
                    from_date=date.fromisoformat(from_raw) if from_raw else None,
                    to_date=date.fromisoformat(to_raw) if to_raw else None,
                )
                return 200, [], serialize_voucher_connection(conn)

            if upper_method == "POST" and route == "/api/v1/ledger/vouchers":
                require_permission(ctx, Permission.LEDGER_POST_VOUCHER)
                payload = strict_json_loads(body)
                voucher = self._execute_post(workspace_id, actor_user_id, payload)
                self._record_audit(
                    ctx,
                    action="VOUCHER_POSTED",
                    entity_type="JournalVoucher",
                    entity_id=voucher.id,
                    payload={
                        "voucherNumber": voucher.voucher_number,
                        "totalDebitNgn": str(voucher.total_debit_ngn),
                        "postingDate": voucher.posting_date.isoformat(),
                    },
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return 201, [], serialize_voucher(voucher)

            if upper_method == "POST" and route == "/api/v1/ledger/vouchers/reverse":
                require_permission(ctx, Permission.LEDGER_REVERSE_VOUCHER)
                payload = strict_json_loads(body)
                reversal = self._execute_reverse(workspace_id, actor_user_id, payload)
                self._record_audit(
                    ctx,
                    action="VOUCHER_REVERSED",
                    entity_type="JournalVoucher",
                    entity_id=reversal.id,
                    payload={
                        "voucherNumber": reversal.voucher_number,
                        "totalDebitNgn": str(reversal.total_debit_ngn),
                    },
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return 200, [], serialize_voucher(reversal)

            if upper_method == "POST" and route == "/api/v1/ledger/transactions/post":
                require_permission(ctx, Permission.LEDGER_POST_VOUCHER)
                payload = strict_json_loads(body)
                tx_res = self._execute_post_standard_transaction(
                    workspace_id, actor_user_id, payload
                )
                self._record_audit(
                    ctx,
                    action="TRANSACTION_POSTED",
                    entity_type="JournalVoucher",
                    entity_id=tx_res.voucher_id,
                    payload={
                        "voucherNumber": tx_res.voucher_number,
                        "transactionType": tx_res.transaction_type,
                        "reference": tx_res.reference,
                        "counterparty": tx_res.counterparty,
                        "totalDebitNgn": str(tx_res.total_debit_ngn),
                    },
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return 201, [], serialize_standard_transaction_result(tx_res)

            if upper_method == "GET" and route == "/api/v1/ledger/reports/frcn":
                require_permission(ctx, Permission.FRCN_REPORTS_READ)
                qs = parse_qs(parsed_url.query)
                period_raw = qs.get("fiscalPeriodId", [None])[0]
                period_id = _parse_uuid(period_raw, field="fiscalPeriodId")
                pkg = self._frcn_uc.execute(workspace_id=workspace_id, fiscal_period_id=period_id)
                return 200, [], serialize_frcn_package(pkg)

            if upper_method == "POST" and route == "/api/v1/ledger/reconcile/bank":
                require_permission(ctx, Permission.LEDGER_RECONCILE)
                payload = strict_json_loads(body)
                rep = self._execute_bank_reconciliation(workspace_id, payload)
                self._record_audit(
                    ctx,
                    action="BANK_RECONCILIATION_RUN",
                    entity_type="BankReconciliation",
                    entity_id=_parse_uuid(payload.get("accountId"), field="accountId"),
                    payload={"matchedCount": rep["matchedCount"]},
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return 200, [], rep

            if upper_method == "POST" and route == "/api/v1/ledger/reconcile/fx-revaluation":
                require_permission(ctx, Permission.LEDGER_RECONCILE)
                payload = strict_json_loads(body)
                rep = self._execute_fx_revaluation(workspace_id, payload)
                self._record_audit(
                    ctx,
                    action="FX_REVALUATION_COMPUTED",
                    entity_type="FxRevaluation",
                    entity_id=_parse_uuid(payload.get("accountId"), field="accountId"),
                    payload={"unrealizedGainLossNgn": rep["unrealizedGainLossNgn"]},
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return 200, [], rep

            if upper_method == "GET" and route == "/api/v1/tax/profile":
                require_permission(ctx, Permission.TAX_READ)
                qs = parse_qs(parsed_url.query)
                as_of_raw = qs.get("asOfDate", [None])[0]
                as_of = date.fromisoformat(as_of_raw) if as_of_raw else date(2026, 3, 1)
                profile, evaluation = self._get_tax_profile_uc.execute(
                    workspace_id=workspace_id,
                    as_of_date=as_of,
                )
                return (
                    200,
                    [],
                    {
                        "profile": serialize_tax_profile(profile),
                        "evaluation": serialize_small_company_evaluation(evaluation),
                    },
                )

            if upper_method == "POST" and route == "/api/v1/tax/profile":
                require_permission(ctx, Permission.TAX_MANAGE)
                payload = strict_json_loads(body)
                profile, evaluation = self._execute_update_tax_profile(workspace_id, payload)
                self._record_audit(
                    ctx,
                    action="TAX_PROFILE_UPDATED",
                    entity_type="NigerianTaxProfile",
                    entity_id=profile.id,
                    payload={
                        "legalForm": profile.legal_form.value,
                        "annualTurnoverNgn": str(profile.annual_turnover_ngn),
                    },
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return (
                    200,
                    [],
                    {
                        "profile": serialize_tax_profile(profile),
                        "evaluation": serialize_small_company_evaluation(evaluation),
                    },
                )

            if upper_method == "GET" and route == "/api/v1/tax/rules":
                require_permission(ctx, Permission.TAX_READ)
                rules = self._list_tax_rules_uc.execute()
                return 200, [], {"items": [serialize_tax_rule_version(r) for r in rules]}

            if upper_method == "POST" and route == "/api/v1/tax/preview":
                require_permission(ctx, Permission.TAX_READ)
                payload = strict_json_loads(body)
                preview = self._execute_preview_tax(workspace_id, payload)
                return 200, [], serialize_tax_preview(preview)

            if upper_method == "POST" and route == "/api/v1/tax/nrs-indirect-preview":
                require_permission(ctx, Permission.TAX_READ)
                payload = strict_json_loads(body)
                breakdown = self._execute_indirect_tax(workspace_id, payload)
                return 200, [], serialize_multilayer_indirect_tax(breakdown)

            if upper_method == "GET" and route == "/api/v1/packs/primitives":
                require_permission(ctx, Permission.PACKS_READ)
                specs = self._list_primitives_uc.execute()
                return 200, [], {"items": [serialize_primitive_capability(spec) for spec in specs]}

            if upper_method == "GET" and route == "/api/v1/packs/profile":
                require_permission(ctx, Permission.PACKS_READ)
                pack_profile = self._get_pack_profile_uc.execute(workspace_id=workspace_id)
                return 200, [], serialize_workspace_industry_profile(pack_profile)

            if upper_method == "POST" and route == "/api/v1/packs/compose-preview":
                require_permission(ctx, Permission.PACKS_READ)
                payload = strict_json_loads(body)
                preview_profile = self._execute_compose_pack_preview(workspace_id, payload)
                return 200, [], serialize_workspace_industry_profile(preview_profile)

            if upper_method == "POST" and route == "/api/v1/packs/configure":
                require_permission(ctx, Permission.PACKS_CONFIGURE)
                payload = strict_json_loads(body)
                configured_profile = self._execute_configure_pack(workspace_id, payload)
                self._record_audit(
                    ctx,
                    action="INDUSTRY_PACK_CONFIGURED",
                    entity_type="WorkspaceIndustryProfile",
                    entity_id=configured_profile.id,
                    payload={"primaryPack": configured_profile.primary_pack.value},
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return 200, [], serialize_workspace_industry_profile(configured_profile)

            if upper_method == "GET" and route == "/api/v1/packs/flagships":
                require_permission(ctx, Permission.PACKS_READ)
                presets = self._list_flagships_uc.execute()
                return 200, [], {"items": [serialize_flagship_pack_preset(p) for p in presets]}

            if upper_method == "POST" and route == "/api/v1/packs/flagships/apply":
                require_permission(ctx, Permission.PACKS_CONFIGURE)
                payload = strict_json_loads(body)
                applied = self._execute_apply_flagship(workspace_id, payload)
                self._record_audit(
                    ctx,
                    action="FLAGSHIP_PACK_APPLIED",
                    entity_type="WorkspaceIndustryProfile",
                    entity_id=applied.id,
                    payload={"primaryPack": applied.primary_pack.value},
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return 200, [], serialize_workspace_industry_profile(applied)

            if upper_method == "POST" and route == "/api/v1/packs/operations/post":
                require_permission(ctx, Permission.LEDGER_POST_VOUCHER)
                payload = strict_json_loads(body)
                op_result = self._execute_post_pack_operation(
                    workspace_id, actor_user_id, payload
                )
                voucher_dict = op_result["voucher"]
                assert isinstance(voucher_dict, dict)
                self._record_audit(
                    ctx,
                    action="PACK_OPERATION_POSTED",
                    entity_type="JournalVoucher",
                    entity_id=UUID(str(voucher_dict["id"])),
                    payload={
                        "operationType": str(payload.get("operationType", "")),
                        "voucherNumber": str(voucher_dict.get("voucherNumber", "")),
                    },
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return 201, [], op_result

            if upper_method == "GET" and route == "/api/v1/audit/events":
                require_permission(ctx, Permission.AUDIT_READ)
                qs = parse_qs(parsed_url.query)
                first = int(qs.get("first", ["50"])[0])
                after = qs.get("after", [None])[0]
                audit_conn = self._list_audit_uc.execute(
                    workspace_id=workspace_id,
                    first=first,
                    after=after,
                )
                return 200, [], serialize_audit_event_connection(audit_conn)

            if upper_method == "GET" and route == "/api/v1/audit/verify":
                require_permission(ctx, Permission.AUDIT_READ)
                verification = self._verify_audit_uc.execute(workspace_id=workspace_id)
                return 200, [], serialize_audit_verification(verification)

            if upper_method == "GET" and route == "/api/v1/audit/cama-certifications":
                require_permission(ctx, Permission.FRCN_REPORTS_READ)
                certs = self._audit_store.list_cama_certifications(workspace_id)
                return 200, [], {"items": [serialize_cama_certification(c) for c in certs]}

            if upper_method == "POST" and route == "/api/v1/audit/cama-certifications":
                require_permission(ctx, Permission.CAMA_CERTIFY_PERIOD)
                payload = strict_json_loads(body)
                period, cert = self._execute_certify_cama(
                    ctx,
                    payload,
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                period_payload = serialize_period(period)
                period_payload["camaCertificationDetail"] = serialize_cama_certification(cert)
                return 201, [], period_payload

            return (
                404,
                [],
                {
                    "__typename": "ValidationError",
                    "code": "NOT_FOUND",
                    "message": f"Route {upper_method} {route} not found.",
                },
            )
        except LedgerDomainError as exc:
            status_code, err_payload = serialize_domain_error(exc)
            return status_code, [], err_payload
        except ValueError as exc:
            return (
                400,
                [],
                {
                    "__typename": "ValidationError",
                    "code": "VALIDATION_ERROR",
                    "message": str(exc),
                    "field": None,
                },
            )

    @staticmethod
    def _parse_cookies(headers: Mapping[str, str]) -> dict[str, str]:
        normalized = {k.lower(): v for k, v in headers.items()}
        raw_cookie = normalized.get("cookie", "")
        cookies: dict[str, str] = {}
        for chunk in raw_cookie.split(";"):
            part = chunk.strip()
            if "=" in part:
                k, v = part.split("=", 1)
                cookies[k.strip()] = v.strip()
        return cookies

    @staticmethod
    def _extract_client_meta(headers: Mapping[str, str]) -> tuple[str, str]:
        normalized = {k.lower(): v for k, v in headers.items()}
        ip_address = (
            normalized.get("x-forwarded-for", "").split(",")[0].strip()
            or normalized.get("x-client-ip", "").strip()
            or "127.0.0.1"
        )
        user_agent = normalized.get("user-agent", "nairabooks-client")[:160]
        return ip_address, user_agent

    @staticmethod
    def _session_cookie_headers(session: SessionResult) -> list[tuple[str, str]]:
        secure_flag = "; Secure" if get_settings().env == "production" else ""
        access_cookie = (
            f"nb_access_token={session.access_token}; HttpOnly; "
            f"SameSite=Lax; Path=/; Max-Age=900{secure_flag}"
        )
        refresh_cookie = (
            f"nb_refresh_token={session.refresh_token}; HttpOnly; "
            f"SameSite=Lax; Path=/api/v1/auth; Max-Age=604800{secure_flag}"
        )
        return [
            ("Set-Cookie", access_cookie),
            ("Set-Cookie", refresh_cookie),
        ]

    @staticmethod
    def _clear_cookie_headers() -> list[tuple[str, str]]:
        return [
            (
                "Set-Cookie",
                "nb_access_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
            ),
            (
                "Set-Cookie",
                "nb_refresh_token=; HttpOnly; SameSite=Lax; Path=/api/v1/auth; Max-Age=0",
            ),
        ]

    def _record_audit(
        self,
        ctx: AuthenticatedContext,
        *,
        action: str,
        entity_type: str,
        entity_id: UUID,
        payload: dict[str, object],
        ip_address: str,
        user_agent: str,
    ) -> None:
        self._record_audit_uc.execute(
            RecordAuditEventCommand(
                workspace_id=ctx.workspace_id,
                actor_user_id=ctx.user_id,
                actor_role=ctx.role,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                payload=payload,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        )

    def _extract_auth_context(self, headers: Mapping[str, str]) -> AuthenticatedContext:
        normalized = {k.lower(): v for k, v in headers.items()}
        cookies = self._parse_cookies(headers)
        auth_header = normalized.get("authorization", "").strip()
        bearer_token: str | None = None
        if auth_header:
            if not auth_header.lower().startswith("bearer "):
                raise AuthenticationError("Authorization header must use Bearer scheme.")
            bearer_token = auth_header[7:].strip()
        elif normalized.get("x-session-token"):
            bearer_token = normalized["x-session-token"].strip()
        elif cookies.get("nb_access_token"):
            bearer_token = cookies["nb_access_token"]

        if bearer_token is not None:
            ctx = self._resolve_auth_uc.execute(bearer_token)
            ws_header = normalized.get("x-workspace-id")
            if ws_header:
                header_ws_id = _parse_uuid(ws_header, field="X-Workspace-Id")
                if header_ws_id != ctx.workspace_id:
                    from nairabooks.ledger.domain import CrossTenantAccessError

                    raise CrossTenantAccessError(
                        "SEC-REQ-01: X-Workspace-Id header cannot override "
                        "authenticated session workspace."
                    )
            return ctx

        if self._require_auth:
            raise AuthenticationError(
                "Authentication required: provide a Bearer token or HTTP-only session cookie."
            )

        ws_raw = normalized.get("x-workspace-id")
        actor_raw = normalized.get("x-actor-user-id")
        workspace_id = _parse_uuid(ws_raw, field="X-Workspace-Id")
        actor_user_id = _parse_uuid(actor_raw, field="X-Actor-User-Id")

        member = self._auth_store.find_member(workspace_id, actor_user_id)
        user = self._auth_store.find_user_by_id(actor_user_id)
        if member is not None:
            if not member.is_active:
                raise AuthenticationError("Workspace membership is inactive.")
            return AuthenticatedContext(
                workspace_id=workspace_id,
                user_id=actor_user_id,
                email=user.email if user else "member@workspace.local",
                full_name=user.full_name if user else "Workspace Member",
                role=member.role,
                session_id=uuid4(),
                auth_method="trusted_header",
            )

        if self._explicit_auth_store or self._auth_store.user_has_any_membership(actor_user_id):
            from nairabooks.ledger.domain import CrossTenantAccessError

            raise CrossTenantAccessError(
                "Actor does not belong to the requested workspace."
            )

        return AuthenticatedContext(
            workspace_id=workspace_id,
            user_id=actor_user_id,
            email="demo@workspace.local",
            full_name="Workspace Owner",
            role=ActorRole.OWNER_MANAGING_DIRECTOR,
            session_id=uuid4(),
            auth_method="legacy_header",
        )

    def _handle_graphql(
        self,
        ctx: AuthenticatedContext,
        payload: dict[str, object],
        *,
        ip_address: str = "127.0.0.1",
        user_agent: str = "nairabooks-client",
    ) -> dict[str, object]:
        workspace_id = ctx.workspace_id
        actor_user_id = ctx.user_id
        query = _parse_str(payload.get("query", ""), field="query")
        validate_graphql_query(query, raise_on_error=True)
        op_name = _parse_optional_str(payload.get("operationName"), field="operationName")
        raw_vars = payload.get("variables")
        variables: dict[str, object] = (
            {str(k): v for k, v in raw_vars.items()} if isinstance(raw_vars, dict) else {}
        )

        if op_name == "PostJournalVoucher" or "postJournalVoucher" in query:
            require_permission(ctx, Permission.LEDGER_POST_VOUCHER)
            raw_input = variables.get("input")
            if not isinstance(raw_input, dict):
                raise ValidationError(
                    "Missing 'input' variable for postJournalVoucher.",
                    field="input",
                )
            try:
                voucher = self._execute_post(
                    workspace_id,
                    actor_user_id,
                    {str(k): v for k, v in raw_input.items()},
                )
                self._record_audit(
                    ctx,
                    action="VOUCHER_POSTED",
                    entity_type="JournalVoucher",
                    entity_id=voucher.id,
                    payload={"voucherNumber": voucher.voucher_number},
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return {"data": {"postJournalVoucher": serialize_voucher(voucher)}}
            except LedgerDomainError as exc:
                _, err_body = serialize_domain_error(exc)
                return {"data": {"postJournalVoucher": err_body}}

        if op_name == "ReverseJournalVoucher" or "reverseJournalVoucher" in query:
            require_permission(ctx, Permission.LEDGER_REVERSE_VOUCHER)
            raw_input = variables.get("input")
            if not isinstance(raw_input, dict):
                raise ValidationError(
                    "Missing 'input' variable for reverseJournalVoucher.",
                    field="input",
                )
            try:
                voucher = self._execute_reverse(
                    workspace_id,
                    actor_user_id,
                    {str(k): v for k, v in raw_input.items()},
                )
                self._record_audit(
                    ctx,
                    action="VOUCHER_REVERSED",
                    entity_type="JournalVoucher",
                    entity_id=voucher.id,
                    payload={"voucherNumber": voucher.voucher_number},
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return {"data": {"reverseJournalVoucher": serialize_voucher(voucher)}}
            except LedgerDomainError as exc:
                _, err_body = serialize_domain_error(exc)
                return {"data": {"reverseJournalVoucher": err_body}}

        if op_name == "CertifyCamaSec405" or "certifyCamaSec405" in query:
            require_permission(ctx, Permission.CAMA_CERTIFY_PERIOD)
            raw_input = variables.get("input")
            if not isinstance(raw_input, dict):
                raise ValidationError(
                    "Missing 'input' variable for certifyCamaSec405.",
                    field="input",
                )
            try:
                period, cert = self._execute_certify_cama(
                    ctx,
                    {str(k): v for k, v in raw_input.items()},
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                period_data = serialize_period(period)
                period_data["camaCertificationDetail"] = serialize_cama_certification(cert)
                return {"data": {"certifyCamaSec405": period_data}}
            except LedgerDomainError as exc:
                _, err_body = serialize_domain_error(exc)
                return {"data": {"certifyCamaSec405": err_body}}

        if "auditEvents" in query:
            require_permission(ctx, Permission.AUDIT_READ)
            first_raw = variables.get("first", 50)
            first = first_raw if isinstance(first_raw, int) else 50
            after = _parse_optional_str(variables.get("after"), field="after")
            audit_conn = self._list_audit_uc.execute(
                workspace_id=workspace_id,
                first=first,
                after=after,
            )
            return {"data": {"auditEvents": serialize_audit_event_connection(audit_conn)}}

        if "chartOfAccounts" in query:
            require_permission(ctx, Permission.LEDGER_READ)
            accounts = self._list_accounts_uc.execute(workspace_id=workspace_id)
            return {"data": {"chartOfAccounts": [serialize_account(a) for a in accounts]}}

        if "fiscalPeriods" in query:
            require_permission(ctx, Permission.LEDGER_READ)
            periods = self._list_periods_uc.execute(workspace_id=workspace_id)
            return {"data": {"fiscalPeriods": [serialize_period(p) for p in periods]}}

        if "journalVouchers" in query:
            require_permission(ctx, Permission.LEDGER_READ)
            first_raw = variables.get("first", 25)
            first = first_raw if isinstance(first_raw, int) else 25
            after = _parse_optional_str(variables.get("after"), field="after")
            conn = self._list_vouchers_uc.execute(
                workspace_id=workspace_id,
                first=first,
                after=after,
            )
            return {"data": {"journalVouchers": serialize_voucher_connection(conn)}}

        if "frcnFinancialPackage" in query:
            require_permission(ctx, Permission.FRCN_REPORTS_READ)
            period_id = _parse_uuid(variables.get("fiscalPeriodId"), field="fiscalPeriodId")
            pkg = self._frcn_uc.execute(workspace_id=workspace_id, fiscal_period_id=period_id)
            return {"data": {"frcnFinancialPackage": serialize_frcn_package(pkg)}}

        if op_name == "UpdateTaxProfile" or "updateTaxProfile" in query:
            require_permission(ctx, Permission.TAX_MANAGE)
            raw_input = variables.get("input")
            if not isinstance(raw_input, dict):
                raise ValidationError(
                    "Missing 'input' variable for updateTaxProfile.",
                    field="input",
                )
            profile, _ = self._execute_update_tax_profile(
                workspace_id,
                {str(k): v for k, v in raw_input.items()},
            )
            self._record_audit(
                ctx,
                action="TAX_PROFILE_UPDATED",
                entity_type="NigerianTaxProfile",
                entity_id=profile.id,
                payload={"legalForm": profile.legal_form.value},
                ip_address=ip_address,
                user_agent=user_agent,
            )
            return {"data": {"updateTaxProfile": serialize_tax_profile(profile)}}

        if op_name == "PreviewNigerianTax" or "previewNigerianTax" in query:
            require_permission(ctx, Permission.TAX_READ)
            raw_input = variables.get("input")
            if not isinstance(raw_input, dict):
                raise ValidationError(
                    "Missing 'input' variable for previewNigerianTax.",
                    field="input",
                )
            preview = self._execute_preview_tax(
                workspace_id,
                {str(k): v for k, v in raw_input.items()},
            )
            return {"data": {"previewNigerianTax": serialize_tax_preview(preview)}}

        if op_name == "ConfigureIndustryPack" or "configureIndustryPack" in query:
            require_permission(ctx, Permission.PACKS_CONFIGURE)
            raw_input = variables.get("input")
            if not isinstance(raw_input, dict):
                raise ValidationError(
                    "Missing 'input' variable for configureIndustryPack.",
                    field="input",
                )
            try:
                pack_profile = self._execute_configure_pack(
                    workspace_id,
                    {str(k): v for k, v in raw_input.items()},
                )
                self._record_audit(
                    ctx,
                    action="INDUSTRY_PACK_CONFIGURED",
                    entity_type="WorkspaceIndustryProfile",
                    entity_id=pack_profile.id,
                    payload={"primaryPack": pack_profile.primary_pack.value},
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return {
                    "data": {
                        "configureIndustryPack": serialize_workspace_industry_profile(pack_profile)
                    }
                }
            except LedgerDomainError as exc:
                _, err_body = serialize_domain_error(exc)
                return {"data": {"configureIndustryPack": err_body}}

        if op_name == "Workspace" or re.search(r"\bworkspace\s*(?:\([^)]*\))?\s*\{", query):
            require_permission(ctx, Permission.PACKS_READ)
            pack_profile = self._get_pack_profile_uc.execute(workspace_id=workspace_id)
            return {
                "data": {
                    "workspace": {
                        "id": str(workspace_id),
                        "industryProfile": serialize_workspace_industry_profile(pack_profile),
                    }
                }
            }

        raise ValidationError("Unsupported GraphQL operation.", field="query")

    def _execute_certify_cama(
        self,
        ctx: AuthenticatedContext,
        payload: dict[str, object],
        *,
        ip_address: str,
        user_agent: str,
    ) -> tuple[FiscalPeriod, CamaSec405Certification]:
        body_raw = _parse_str(payload.get("professionalBody"), field="professionalBody")
        try:
            prof_body = ProfessionalBody(body_raw)
        except ValueError as exc:
            raise ValidationError(
                f"Unknown professionalBody '{body_raw}'. Must be ICAN, ANAN, or DIRECTOR_CAMA.",
                field="professionalBody",
            ) from exc
        prepared_raw = payload.get("preparedByUserId")
        prepared_by = (
            _parse_uuid(prepared_raw, field="preparedByUserId")
            if prepared_raw is not None
            else None
        )
        return self._certify_cama_uc.execute(
            CertifyCamaSec405Command(
                workspace_id=ctx.workspace_id,
                fiscal_period_id=_parse_uuid(
                    payload.get("fiscalPeriodId"), field="fiscalPeriodId"
                ),
                certified_by_user_id=ctx.user_id,
                certified_by_role=ctx.role,
                certified_by_name=_parse_str(
                    payload.get("certifiedByName"), field="certifiedByName"
                ),
                professional_body=prof_body,
                frc_reg_number=_parse_str(payload.get("frcRegNumber"), field="frcRegNumber"),
                prepared_by_user_id=prepared_by,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        )

    def _execute_post(
        self,
        workspace_id: UUID,
        actor_user_id: UUID,
        payload: dict[str, object],
    ) -> JournalVoucher:
        raw_lines = payload.get("lines")
        if not isinstance(raw_lines, list):
            raise ValidationError("Field 'lines' must be an array.", field="lines")

        parsed_lines: list[JournalLineInput] = []
        for raw_line in raw_lines:
            if not isinstance(raw_line, dict):
                raise ValidationError("Each line entry must be an object.", field="lines")
            line_dict = {str(k): v for k, v in raw_line.items()}
            currency_str = _parse_str(line_dict.get("currency", "NGN"), field="currency")
            parsed_lines.append(
                JournalLineInput(
                    account_id=_parse_uuid(line_dict.get("accountId"), field="accountId"),
                    debit_amount=_parse_money_input(
                        line_dict.get("debitAmount", "0.00"), field="debitAmount"
                    ),
                    credit_amount=_parse_money_input(
                        line_dict.get("creditAmount", "0.00"), field="creditAmount"
                    ),
                    currency=CurrencyCode(currency_str),
                    exchange_rate_to_ngn=_parse_money_input(
                        line_dict.get("exchangeRateToNgn", "1.000000"),
                        field="exchangeRateToNgn",
                    ),
                    fund_or_department_code=_parse_optional_str(
                        line_dict.get("fundOrDepartmentCode"),
                        field="fundOrDepartmentCode",
                    ),
                    project_or_site_code=_parse_optional_str(
                        line_dict.get("projectOrSiteCode"),
                        field="projectOrSiteCode",
                    ),
                    memo=_parse_optional_str(line_dict.get("memo"), field="memo"),
                )
            )

        approved_raw = payload.get("approvedByUserId")
        approved_by = (
            _parse_uuid(approved_raw, field="approvedByUserId")
            if approved_raw is not None
            else None
        )
        command = PostJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_user_id,
            idempotency_key=_parse_uuid(payload.get("idempotencyKey"), field="idempotencyKey"),
            posting_date=_parse_date(payload.get("postingDate"), field="postingDate"),
            reference=_parse_str(payload.get("reference"), field="reference"),
            source_module=_parse_str(payload.get("sourceModule"), field="sourceModule"),
            lines=parsed_lines,
            approved_by_user_id=approved_by,
        )
        return self._post_uc.execute(command)

    def _execute_reverse(
        self,
        workspace_id: UUID,
        actor_user_id: UUID,
        payload: dict[str, object],
    ) -> JournalVoucher:
        command = ReverseJournalVoucherCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_user_id,
            idempotency_key=_parse_uuid(payload.get("idempotencyKey"), field="idempotencyKey"),
            original_voucher_id=_parse_uuid(
                payload.get("originalVoucherId"), field="originalVoucherId"
            ),
            reversal_date=_parse_date(payload.get("reversalDate"), field="reversalDate"),
            reason=_parse_str(payload.get("reason"), field="reason"),
        )
        return self._reverse_uc.execute(command)

    def _execute_post_standard_transaction(
        self,
        workspace_id: UUID,
        actor_user_id: UUID,
        payload: dict[str, object],
    ) -> StandardTransactionPostingResult:
        tx_type_raw = payload.get("transactionType") or payload.get("typeId")
        tx_type = _parse_str(tx_type_raw, field="transactionType")
        reference = _parse_str(payload.get("reference"), field="reference")
        cparty_raw = payload.get("counterparty") or "General Counterparty"
        counterparty = _parse_str(cparty_raw, field="counterparty")
        date_raw = payload.get("date") or payload.get("postingDate")
        posting_date = _parse_date(date_raw, field="date")
        due_date_raw = payload.get("dueDate")
        due_date = _parse_date(due_date_raw, field="dueDate") if due_date_raw else None
        method_raw = payload.get("paymentMethod") or "Bank Transfer"
        payment_method = _parse_str(method_raw, field="paymentMethod")
        vat_enabled = bool(payload.get("vatEnabled", False))
        wht_rate = Decimal(str(payload.get("whtRatePct", 0)))
        memo = _parse_str(payload.get("memo") or "", field="memo")
        idem_raw = payload.get("idempotencyKey")
        idem_key = (
            _parse_uuid(idem_raw, field="idempotencyKey")
            if idem_raw is not None
            else uuid4()
        )

        raw_lines = payload.get("lineItems") or payload.get("lines") or []
        if not isinstance(raw_lines, list):
            raise ValidationError("Field 'lineItems' must be an array.", field="lineItems")

        parsed_lines: list[StandardTransactionLineItemInput] = []
        for idx, rl in enumerate(raw_lines):
            if not isinstance(rl, dict):
                continue
            line_dict = {str(k): v for k, v in rl.items()}
            desc_raw = line_dict.get("description") or f"Line {idx+1}"
            acct_code_raw = line_dict.get("accountCode") or "4010"
            parsed_lines.append(
                StandardTransactionLineItemInput(
                    description=_parse_str(desc_raw, field="description"),
                    account_code=_parse_str(acct_code_raw, field="accountCode"),
                    quantity=Decimal(str(line_dict.get("quantity", 1))),
                    unit_price_ngn=Decimal(str(line_dict.get("unitPriceNgn", 0))),
                    vat_applicable=bool(line_dict.get("vatApplicable", False)),
                    debit_ngn=Decimal(str(line_dict.get("debitNgn", 0))),
                    credit_ngn=Decimal(str(line_dict.get("creditNgn", 0))),
                )
            )

        details_val = payload.get("details")
        details_dict = (
            {str(k): str(v) for k, v in details_val.items()}
            if isinstance(details_val, dict)
            else None
        )
        cmd = PostStandardTransactionCommand(
            workspace_id=workspace_id,
            actor_user_id=actor_user_id,
            idempotency_key=idem_key,
            transaction_type=tx_type,
            reference=reference,
            counterparty=counterparty,
            posting_date=posting_date,
            due_date=due_date,
            payment_method=payment_method,
            vat_enabled=vat_enabled,
            wht_rate_pct=wht_rate,
            memo=memo,
            lines=parsed_lines,
            details=details_dict,
        )
        return self._post_std_tx_uc.execute(cmd)

    def _execute_bank_reconciliation(
        self,
        workspace_id: UUID,
        payload: dict[str, object],
    ) -> dict[str, object]:
        account_id = _parse_uuid(payload.get("accountId"), field="accountId")
        through_raw = _parse_optional_str(payload.get("throughDate"), field="throughDate")
        through_date = date.fromisoformat(through_raw) if through_raw else None
        raw_lines = payload.get("statementLines")
        if not isinstance(raw_lines, list):
            raise ValidationError(
                "Field 'statementLines' must be an array.",
                field="statementLines",
            )

        parsed_lines: list[BankStatementLine] = []
        for raw_item in raw_lines:
            if not isinstance(raw_item, dict):
                raise ValidationError(
                    "Each statement line must be an object.", field="statementLines"
                )
            item = {str(k): v for k, v in raw_item.items()}
            direction = _parse_str(item.get("direction"), field="direction")
            if direction not in ("CREDIT", "DEBIT"):
                raise ValidationError("Direction must be CREDIT or DEBIT.", field="direction")
            parsed_lines.append(
                BankStatementLine(
                    line_id=_parse_str(item.get("lineId"), field="lineId"),
                    value_date=_parse_date(item.get("valueDate"), field="valueDate"),
                    amount_ngn=parse_decimal(
                        _parse_money_input(item.get("amountNgn"), field="amountNgn"),
                        quantum=MONEY_QUANTUM,
                        field="amountNgn",
                    ),
                    direction="CREDIT" if direction == "CREDIT" else "DEBIT",
                    channel=_parse_str(item.get("channel", "BANK_TRANSFER"), field="channel"),
                    reference=_parse_str(item.get("reference", ""), field="reference"),
                    fee_ngn=parse_decimal(
                        _parse_money_input(item.get("feeNgn", "0.00"), field="feeNgn"),
                        quantum=MONEY_QUANTUM,
                        field="feeNgn",
                    ),
                )
            )
        report = self._reconcile_uc.execute(
            workspace_id=workspace_id,
            account_id=account_id,
            statement_lines=parsed_lines,
            through_date=through_date,
        )
        return serialize_bank_reconciliation(report)

    def _execute_fx_revaluation(
        self,
        workspace_id: UUID,
        payload: dict[str, object],
    ) -> dict[str, object]:
        account_id = _parse_uuid(payload.get("accountId"), field="accountId")
        currency = CurrencyCode(_parse_str(payload.get("currency"), field="currency"))
        closing_rate = _parse_money_input(
            payload.get("closingRateToNgn"),
            field="closingRateToNgn",
        )
        as_of_date = _parse_date(payload.get("asOfDate"), field="asOfDate")
        report = self._fx_reval_uc.execute(
            workspace_id=workspace_id,
            account_id=account_id,
            currency=currency,
            closing_rate_to_ngn=closing_rate,
            as_of_date=as_of_date,
        )
        return serialize_fx_revaluation(report)

    def _execute_update_tax_profile(
        self,
        workspace_id: UUID,
        payload: dict[str, object],
    ) -> tuple[NigerianTaxProfile, SmallCompanyEvaluation]:
        effective_raw = _parse_optional_str(payload.get("effectiveFrom"), field="effectiveFrom")
        effective_from = (
            _parse_date(effective_raw, field="effectiveFrom")
            if effective_raw
            else date(2026, 1, 1)
        )
        is_prof = (
            _parse_bool(payload["isProfessionalServices"], field="isProfessionalServices")
            if "isProfessionalServices" in payload
            else False
        )
        command = UpdateTaxProfileCommand(
            workspace_id=workspace_id,
            legal_form=NigerianLegalForm(_parse_str(payload.get("legalForm"), field="legalForm")),
            tin_number=_parse_optional_str(payload.get("tinNumber"), field="tinNumber"),
            vat_registered=_parse_bool(payload.get("vatRegistered"), field="vatRegistered"),
            annual_turnover_ngn=_parse_money_input(
                payload.get("annualTurnoverNgn"),
                field="annualTurnoverNgn",
            ),
            fixed_assets_ngn=_parse_money_input(
                payload.get("fixedAssetsNgn"),
                field="fixedAssetsNgn",
            ),
            state_of_operation=_parse_str(
                payload.get("stateOfOperation"),
                field="stateOfOperation",
            ),
            is_professional_services=is_prof,
            effective_from=effective_from,
        )
        return self._update_tax_profile_uc.execute(command)

    def _execute_preview_tax(
        self,
        workspace_id: UUID,
        payload: dict[str, object],
    ) -> TaxComputationPreview:
        if "appliedRate" in payload or "taxRate" in payload:
            raise ValidationError(
                "SEC-REQ-04: Callers may not supply or override statutory tax rates.",
                field="supplyCategoryCode",
            )
        command = PreviewNigerianTaxCommand(
            workspace_id=workspace_id,
            transaction_date=_parse_date(
                payload.get("transactionDate"),
                field="transactionDate",
            ),
            regime=TaxRegimeType(_parse_str(payload.get("regime"), field="regime")),
            gross_amount_ngn=_parse_money_input(
                payload.get("grossAmountNgn"),
                field="grossAmountNgn",
            ),
            counterparty_has_valid_tin=_parse_bool(
                payload.get("counterpartyHasValidTin"),
                field="counterpartyHasValidTin",
            ),
            supply_category_code=_parse_str(
                payload.get("supplyCategoryCode"),
                field="supplyCategoryCode",
            ),
            monthly_cumulative_with_supplier_ngn=_parse_money_input(
                payload.get("monthlyCumulativeWithSupplierNgn", "0.00"),
                field="monthlyCumulativeWithSupplierNgn",
            ),
        )
        return self._preview_tax_uc.execute(command)

    def _execute_indirect_tax(
        self,
        workspace_id: UUID,
        payload: dict[str, object],
    ) -> MultiLayerIndirectTaxBreakdown:
        if "appliedRate" in payload or "vatRate" in payload or "whtRate" in payload:
            raise ValidationError(
                "SEC-REQ-04: Callers may not supply or override statutory VAT/WHT/State rates.",
                field="vatSupplyCategoryCode",
            )
        include_state = (
            _parse_bool(payload["includeStateConsumptionTax"], field="includeStateConsumptionTax")
            if "includeStateConsumptionTax" in payload
            else False
        )
        has_tin = (
            _parse_bool(payload["counterpartyHasValidTin"], field="counterpartyHasValidTin")
            if "counterpartyHasValidTin" in payload
            else True
        )
        direction_raw = _parse_str(
            payload.get("transactionDirection", "SALES"),
            field="transactionDirection",
        )
        command = CalculateMultiLayerIndirectTaxCommand(
            workspace_id=workspace_id,
            transaction_date=_parse_date(
                payload.get("transactionDate"),
                field="transactionDate",
            ),
            base_amount_ngn=_parse_money_input(
                payload.get("baseAmountNgn"),
                field="baseAmountNgn",
            ),
            vat_supply_category_code=_parse_str(
                payload.get("vatSupplyCategoryCode", "STANDARD_TAXABLE_SUPPLY"),
                field="vatSupplyCategoryCode",
            ),
            vat_regime=TaxRegimeType(
                _parse_str(payload.get("vatRegime", "VAT_STANDARD_7_5"), field="vatRegime")
            ),
            include_state_consumption_tax=include_state,
            state_supply_category_code=_parse_str(
                payload.get("stateSupplyCategoryCode", "HOSPITALITY_CONSUMPTION_TAX"),
                field="stateSupplyCategoryCode",
            ),
            service_charge_rate=_parse_money_input(
                payload.get("serviceChargeRate", "0.000000"),
                field="serviceChargeRate",
            ),
            wht_supply_category_code=_parse_optional_str(
                payload.get("whtSupplyCategoryCode"),
                field="whtSupplyCategoryCode",
            ),
            counterparty_has_valid_tin=has_tin,
            monthly_cumulative_with_supplier_ngn=_parse_money_input(
                payload.get("monthlyCumulativeWithSupplierNgn", "0.00"),
                field="monthlyCumulativeWithSupplierNgn",
            ),
            transaction_direction=TransactionDirection(direction_raw),
        )
        return self._indirect_tax_uc.execute(command)

    def _parse_pack_payload(
        self, payload: dict[str, object]
    ) -> tuple[FlagshipPackCode, bool, tuple[OperationalPrimitive, ...], dict[str, str] | None]:
        primary_raw = _parse_str(
            payload.get("primaryPack", FlagshipPackCode.CUSTOM_COMPOSABLE.value),
            field="primaryPack",
        )
        try:
            primary_pack = FlagshipPackCode(primary_raw)
        except ValueError as exc:
            raise ValidationError(
                f"Unknown FlagshipPackCode '{primary_raw}'.",
                field="primaryPack",
            ) from exc

        is_hybrid = (
            _parse_bool(payload["isHybridMultiUnit"], field="isHybridMultiUnit")
            if "isHybridMultiUnit" in payload
            else False
        )

        raw_primitives = payload.get("primitives")
        if not isinstance(raw_primitives, list):
            raise ValidationError(
                "Field 'primitives' must be an array of OperationalPrimitive names.",
                field="primitives",
            )
        prim_strings = [_parse_str(item, field="primitives") for item in raw_primitives]
        primitives = normalize_primitives(prim_strings)

        raw_overrides = payload.get("terminologyOverrides")
        overrides: dict[str, str] | None = None
        if raw_overrides is not None:
            if not isinstance(raw_overrides, dict):
                raise ValidationError(
                    "Field 'terminologyOverrides' must be a key/value object.",
                    field="terminologyOverrides",
                )
            overrides = {
                _parse_str(k, field="terminologyOverrides"): _parse_str(
                    v, field="terminologyOverrides"
                )
                for k, v in raw_overrides.items()
            }

        return primary_pack, is_hybrid, primitives, overrides

    def _execute_compose_pack_preview(
        self,
        workspace_id: UUID,
        payload: dict[str, object],
    ) -> WorkspaceIndustryProfile:
        primary_pack, is_hybrid, primitives, overrides = self._parse_pack_payload(payload)
        display_name = _parse_str(
            payload.get("displayName", "Custom Composable Business Pack"),
            field="displayName",
        )
        return self._compose_pack_preview_uc.execute(
            ComposeCustomPackCommand(
                workspace_id=workspace_id,
                primary_pack=primary_pack,
                primitives=primitives,
                is_hybrid_multi_unit=is_hybrid,
                display_name=display_name,
                terminology_overrides=overrides,
            )
        )

    def _execute_configure_pack(
        self,
        workspace_id: UUID,
        payload: dict[str, object],
    ) -> WorkspaceIndustryProfile:
        primary_pack, is_hybrid, primitives, overrides = self._parse_pack_payload(payload)
        return self._configure_pack_uc.execute(
            ConfigureIndustryPackCommand(
                workspace_id=workspace_id,
                primary_pack=primary_pack,
                is_hybrid_multi_unit=is_hybrid,
                primitives=primitives,
                terminology_overrides=overrides,
            )
        )

    def _execute_apply_flagship(
        self,
        workspace_id: UUID,
        payload: dict[str, object],
    ) -> WorkspaceIndustryProfile:
        raw_code = _parse_str(payload.get("packCode"), field="packCode")
        try:
            pack_code = FlagshipPackCode(raw_code)
        except ValueError as exc:
            raise ValidationError(
                f"Unknown FlagshipPackCode '{raw_code}'.",
                field="packCode",
            ) from exc
        raw_overrides = payload.get("terminologyOverrides")
        overrides: dict[str, str] | None = None
        if raw_overrides is not None:
            if not isinstance(raw_overrides, dict):
                raise ValidationError(
                    "Field 'terminologyOverrides' must be a key/value object.",
                    field="terminologyOverrides",
                )
            overrides = {
                _parse_str(k, field="terminologyOverrides"): _parse_str(
                    v, field="terminologyOverrides"
                )
                for k, v in raw_overrides.items()
            }
        return self._apply_flagship_uc.execute(
            ApplyFlagshipPackCommand(
                workspace_id=workspace_id,
                pack_code=pack_code,
                terminology_overrides=overrides,
            )
        )

    def _execute_post_pack_operation(
        self,
        workspace_id: UUID,
        actor_user_id: UUID,
        payload: dict[str, object],
    ) -> dict[str, object]:
        op_raw = _parse_str(payload.get("operationType"), field="operationType")
        try:
            op_type = PackOperationType(op_raw)
        except ValueError as exc:
            raise ValidationError(
                f"Unknown PackOperationType '{op_raw}'.",
                field="operationType",
            ) from exc
        posting_date = _parse_date(payload.get("postingDate"), field="postingDate")
        reference = _parse_str(payload.get("reference"), field="reference")
        idem_raw = payload.get("idempotencyKey")
        idem_key = (
            _parse_uuid(idem_raw, field="idempotencyKey") if idem_raw is not None else uuid4()
        )
        raw_inner = payload.get("payload")
        if not isinstance(raw_inner, dict):
            raise ValidationError("Field 'payload' must be a JSON object.", field="payload")

        voucher, plan = self._post_pack_op_uc.execute_with_plan(
            PostPackOperationCommand(
                workspace_id=workspace_id,
                actor_user_id=actor_user_id,
                idempotency_key=idem_key,
                posting_date=posting_date,
                operation_type=op_type,
                reference=reference,
                payload={str(k): v for k, v in raw_inner.items()},
            )
        )
        return {
            "voucher": serialize_voucher(voucher),
            "summary": plan.summary,
            "metrics": dict(plan.metrics),
        }
