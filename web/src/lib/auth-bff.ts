import { createHash, createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

import { certifyPeriodCamaInLocalLedger, fetchFiscalPeriods } from "@/lib/bff-client";
import type {
  ActorRole,
  AuditChainVerification,
  AuditEventRecord,
  AuthSessionPayload,
  AuthUserSummary,
  AuthWorkspaceSummary,
  CamaSec405CertificationRecord,
  Permission,
  SecurityWorkspaceInitialData,
  SegregationOfDutiesError,
  WorkspaceMemberRecord,
  WorkspaceMembershipSummary,
} from "@/types/auth";
import type { AuthSecurityError, CrossTenantAccessError, ValidationError } from "@/types/ledger";

export const PRIMARY_WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
export const SECONDARY_WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002";
export const SESSION_COOKIE_NAME = "nb_session";
const GENESIS_HASH = "0".repeat(64);
const SENSITIVE_KEY_PATTERN = /password|secret|token|cookie|credential|hash/i;

export const ROLE_PERMISSIONS: Readonly<Record<ActorRole, readonly Permission[]>> = {
  OWNER_MANAGING_DIRECTOR: [
    "LEDGER_READ",
    "LEDGER_POST",
    "LEDGER_REVERSE",
    "LEDGER_PERIOD_CLOSE",
    "TAX_READ",
    "TAX_WRITE",
    "PACKS_READ",
    "PACKS_WRITE",
    "AUDIT_READ",
    "AUDIT_CAMA_CERTIFY",
    "MEMBERS_MANAGE",
  ],
  CHARTERED_ACCOUNTANT_CFO: [
    "LEDGER_READ",
    "LEDGER_POST",
    "LEDGER_REVERSE",
    "LEDGER_PERIOD_CLOSE",
    "TAX_READ",
    "TAX_WRITE",
    "PACKS_READ",
    "PACKS_WRITE",
    "AUDIT_READ",
    "AUDIT_CAMA_CERTIFY",
  ],
  BOOKKEEPER: [
    "LEDGER_READ",
    "LEDGER_POST",
    "TAX_READ",
    "TAX_WRITE",
    "PACKS_READ",
    "PACKS_WRITE",
  ],
  BRANCH_OUTLET_CASHIER: [
    "LEDGER_READ",
    "LEDGER_POST",
    "TAX_READ",
    "PACKS_READ",
    "PACKS_WRITE",
  ],
  EXTERNAL_AUDITOR_READONLY: [
    "LEDGER_READ",
    "TAX_READ",
    "PACKS_READ",
    "AUDIT_READ",
  ],
};

interface InternalUserRecord {
  id: string;
  email: string;
  fullName: string;
  passwordPhc: string;
  frcRegNumber: string | null;
}

interface InternalMembershipRecord {
  workspaceId: string;
  userId: string;
  role: ActorRole;
  isActive: boolean;
}

interface SignedTokenClaims {
  sub: string;
  ws: string;
  role: ActorRole;
  jti: string;
  iat: number;
  exp: number;
}

export interface AuthorizedActorContext {
  userId: string;
  email: string;
  fullName: string;
  workspaceId: string;
  role: ActorRole;
  permissions: readonly Permission[];
  isAuthenticatedCookie: boolean;
}

interface LocalAuthState {
  signingSecret: string;
  workspaces: AuthWorkspaceSummary[];
  users: InternalUserRecord[];
  memberships: InternalMembershipRecord[];
  auditEvents: AuditEventRecord[];
  camaCertifications: CamaSec405CertificationRecord[];
  failedAttempts: Map<string, number[]>;
}

const globalAuthRef = globalThis as typeof globalThis & {
  __nairabooksAuthState?: LocalAuthState;
};

function hashPasswordScrypt(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 }).toString("hex");
  return `$scrypt$n=16384,r=8,p=1$${salt}$${derived}`;
}

function verifyPasswordScrypt(password: string, storedPhc: string): boolean {
  const parts = storedPhc.split("$");
  if (parts.length !== 5 || parts[1] !== "scrypt") {
    return false;
  }
  const salt = parts[3];
  const expectedHex = parts[4];
  if (!salt || !expectedHex) {
    return false;
  }
  const expectedBuf = Buffer.from(expectedHex, "hex");
  const actualBuf = scryptSync(password, salt, expectedBuf.length, { N: 16384, r: 8, p: 1 });
  return expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf);
}

function sanitizeAuditPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditPayload(item));
  }
  if (value !== null && typeof value === "object") {
    const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
    const out: Record<string, unknown> = {};
    for (const k of sortedKeys) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = sanitizeAuditPayload((value as Record<string, unknown>)[k]);
      }
    }
    return out;
  }
  return value;
}

function computePayloadHash(payload: unknown): string {
  const sanitized = sanitizeAuditPayload(payload);
  return createHash("sha256").update(JSON.stringify(sanitized)).digest("hex");
}

function computeEventHash(parts: {
  previousHash: string;
  workspaceId: string;
  actorUserId: string;
  actorRole: ActorRole;
  action: string;
  entityType: string;
  entityId: string;
  payloadHash: string;
  occurredAt: string;
}): string {
  const material = [
    parts.previousHash,
    parts.workspaceId,
    parts.actorUserId,
    parts.actorRole,
    parts.action,
    parts.entityType,
    parts.entityId,
    parts.payloadHash,
    parts.occurredAt,
  ].join("|");
  return createHash("sha256").update(material).digest("hex");
}

function appendImmutableEvent(
  state: LocalAuthState,
  input: {
    workspaceId: string;
    actorUserId: string;
    actorRole: ActorRole;
    action: string;
    entityType: string;
    entityId: string;
    payload: unknown;
    occurredAt?: string;
  },
): AuditEventRecord {
  const wsEvents = state.auditEvents.filter((e) => e.workspaceId === input.workspaceId);
  const lastEvent = wsEvents[wsEvents.length - 1];
  const prevHash = lastEvent ? lastEvent.eventHash : GENESIS_HASH;
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const payloadHash = computePayloadHash(input.payload);
  const eventHash = computeEventHash({
    previousHash: prevHash,
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    payloadHash,
    occurredAt,
  });
  const record: AuditEventRecord = Object.freeze({
    id: randomUUID(),
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    payloadHash,
    previousHash: prevHash,
    eventHash,
    occurredAt,
  });
  state.auditEvents.push(record);
  return record;
}

function getLocalAuthState(): LocalAuthState {
  if (globalAuthRef.__nairabooksAuthState) {
    return globalAuthRef.__nairabooksAuthState;
  }

  const demoPasswordPhc = hashPasswordScrypt("NairaBooks#2026");

  const state: LocalAuthState = {
    signingSecret:
      process.env.NAIRABOOKS_SESSION_SECRET ?? randomBytes(32).toString("hex"),
    workspaces: [
      {
        id: PRIMARY_WORKSPACE_ID,
        legalName: "Lagos Trading & Hospitality Ltd",
        rcNumber: "RC 1482910",
        baseCurrency: "NGN",
      },
      {
        id: SECONDARY_WORKSPACE_ID,
        legalName: "Abuja Clinic & Pharmacy Ltd",
        rcNumber: "RC 2094418",
        baseCurrency: "NGN",
      },
    ],
    users: [
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001",
        email: "owner@lagostrading.ng",
        fullName: "Adaeze Nwosu",
        passwordPhc: demoPasswordPhc,
        frcRegNumber: null,
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002",
        email: "cfo@lagostrading.ng",
        fullName: "Tunde Bakare FCA",
        passwordPhc: demoPasswordPhc,
        frcRegNumber: "FRC/2026/000991",
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0003",
        email: "clerk@lagostrading.ng",
        fullName: "Amina Ibrahim",
        passwordPhc: demoPasswordPhc,
        frcRegNumber: null,
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0004",
        email: "cashier@lagostrading.ng",
        fullName: "Seyi Ogunleye",
        passwordPhc: demoPasswordPhc,
        frcRegNumber: null,
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0005",
        email: "auditor@icanaudit.ng",
        fullName: "Ngozi Eze FCA",
        passwordPhc: demoPasswordPhc,
        frcRegNumber: "FRC/2026/000412",
      },
    ],
    memberships: [
      {
        workspaceId: PRIMARY_WORKSPACE_ID,
        userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001",
        role: "OWNER_MANAGING_DIRECTOR",
        isActive: true,
      },
      {
        workspaceId: SECONDARY_WORKSPACE_ID,
        userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001",
        role: "OWNER_MANAGING_DIRECTOR",
        isActive: true,
      },
      {
        workspaceId: PRIMARY_WORKSPACE_ID,
        userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002",
        role: "CHARTERED_ACCOUNTANT_CFO",
        isActive: true,
      },
      {
        workspaceId: PRIMARY_WORKSPACE_ID,
        userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0003",
        role: "BOOKKEEPER",
        isActive: true,
      },
      {
        workspaceId: PRIMARY_WORKSPACE_ID,
        userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0004",
        role: "BRANCH_OUTLET_CASHIER",
        isActive: true,
      },
      {
        workspaceId: PRIMARY_WORKSPACE_ID,
        userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0005",
        role: "EXTERNAL_AUDITOR_READONLY",
        isActive: true,
      },
    ],
    auditEvents: [],
    camaCertifications: [],
    failedAttempts: new Map(),
  };

  appendImmutableEvent(state, {
    workspaceId: PRIMARY_WORKSPACE_ID,
    actorUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001",
    actorRole: "OWNER_MANAGING_DIRECTOR",
    action: "WORKSPACE_INITIALIZED",
    entityType: "Workspace",
    entityId: PRIMARY_WORKSPACE_ID,
    payload: { legalName: "Lagos Trading & Hospitality Ltd", compliance: "CAMA_2020_FRCN" },
    occurredAt: "2026-01-01T08:00:00.000Z",
  });

  globalAuthRef.__nairabooksAuthState = state;
  return state;
}

function signToken(claims: SignedTokenClaims, secret: string): string {
  const payloadB64 = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const sigB64 = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sigB64}`;
}

function verifyToken(token: string, secret: string): SignedTokenClaims | null {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }
  const payloadB64 = parts[0];
  const sigB64 = parts[1];
  if (!payloadB64 || !sigB64) {
    return null;
  }
  const expectedSig = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  const actualBuf = Buffer.from(sigB64, "utf8");
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as SignedTokenClaims;
    if (typeof parsed.exp !== "number" || Date.now() >= parsed.exp * 1000) {
      return null;
    }
    if (!parsed.sub || !parsed.ws || !ROLE_PERMISSIONS[parsed.role]) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function extractSessionToken(request: NextRequest | Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  if ("cookies" in request && typeof request.cookies?.get === "function") {
    const fromNext = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (fromNext) {
      return fromNext;
    }
  }
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      return decodeURIComponent(trimmed.slice(SESSION_COOKIE_NAME.length + 1));
    }
  }
  return null;
}

export function formatSessionCookieHeader(token: string, maxAgeSeconds = 900): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secure}`;
}

export function formatClearSessionCookieHeader(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

function buildSessionPayload(
  state: LocalAuthState,
  user: InternalUserRecord,
  workspace: AuthWorkspaceSummary,
  role: ActorRole,
): AuthSessionPayload {
  const availableWorkspaces: WorkspaceMembershipSummary[] = state.memberships
    .filter((m) => m.userId === user.id && m.isActive)
    .map((m) => {
      const ws = state.workspaces.find((w) => w.id === m.workspaceId);
      return ws
        ? {
            id: ws.id,
            legalName: ws.legalName,
            rcNumber: ws.rcNumber,
            role: m.role,
          }
        : null;
    })
    .filter((item): item is WorkspaceMembershipSummary => item !== null);

  const userSummary: AuthUserSummary = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role,
    designation: role,
    frcRegNumber: user.frcRegNumber,
  };

  return {
    authenticated: true,
    user: userSummary,
    workspace,
    availableWorkspaces,
    permissions: ROLE_PERMISSIONS[role],
  };
}

function authError(
  __typename: AuthSecurityError["__typename"],
  code: string,
  message: string,
): AuthSecurityError {
  return { __typename, code, message };
}

function validationErr(message: string, field: string | null = null): ValidationError {
  return { __typename: "ValidationError", code: "VALIDATION_ERROR", message, field };
}

export async function authorizeApiRequest(
  request?: NextRequest | Request,
  requiredPermission?: Permission,
): Promise<
  | { ok: true; ctx: AuthorizedActorContext }
  | { ok: false; status: number; body: AuthSecurityError | CrossTenantAccessError }
> {
  const state = getLocalAuthState();
  const rawToken = request ? extractSessionToken(request) : null;

  if (rawToken) {
    const claims = verifyToken(rawToken, state.signingSecret);
    if (!claims) {
      return {
        ok: false,
        status: 401,
        body: authError(
          "AuthenticationError",
          "AUTHENTICATION_ERROR",
          "Invalid or expired session token.",
        ),
      };
    }

    const headerWorkspace = request?.headers.get("x-workspace-id")?.trim();
    if (headerWorkspace && headerWorkspace !== claims.ws) {
      return {
        ok: false,
        status: 403,
        body: {
          __typename: "CrossTenantAccessError",
          code: "CROSS_TENANT_ACCESS_DENIED",
          message:
            "SEC-REQ-01: X-Workspace-Id header cannot override authenticated session workspace.",
        },
      };
    }

    const membership = state.memberships.find(
      (m) => m.userId === claims.sub && m.workspaceId === claims.ws && m.isActive,
    );
    const user = state.users.find((u) => u.id === claims.sub);
    if (!membership || !user) {
      return {
        ok: false,
        status: 401,
        body: authError("AuthenticationError", "AUTHENTICATION_ERROR", "Account session is no longer active."),
      };
    }

    const permissions = ROLE_PERMISSIONS[membership.role];
    if (requiredPermission && !permissions.includes(requiredPermission)) {
      return {
        ok: false,
        status: 403,
        body: authError(
          "AuthorizationError",
          "AUTHORIZATION_ERROR",
          `Role '${membership.role}' lacks permission '${requiredPermission}'.`,
        ),
      };
    }

    return {
      ok: true,
      ctx: {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        workspaceId: membership.workspaceId,
        role: membership.role,
        permissions,
        isAuthenticatedCookie: true,
      },
    };
  }

  // Unauthenticated request: fail-closed when strict auth is requested or cookie header missing on protected auth endpoints
  if (request?.headers.get("x-require-auth") === "1") {
    return {
      ok: false,
      status: 401,
      body: authError("AuthenticationError", "AUTHENTICATION_ERROR", "Authentication cookie required."),
    };
  }

  // Backward-compatible local demo context for existing Slices 1-6 BFF workflow calls
  const defaultOwner = state.users[0]!;
  const defaultRole: ActorRole = "OWNER_MANAGING_DIRECTOR";
  const permissions = ROLE_PERMISSIONS[defaultRole];
  if (requiredPermission && !permissions.includes(requiredPermission)) {
    return {
      ok: false,
      status: 403,
      body: authError("AuthorizationError", "AUTHORIZATION_ERROR", "Permission denied."),
    };
  }

  return {
    ok: true,
    ctx: {
      userId: defaultOwner.id,
      email: defaultOwner.email,
      fullName: defaultOwner.fullName,
      workspaceId: PRIMARY_WORKSPACE_ID,
      role: defaultRole,
      permissions,
      isAuthenticatedCookie: false,
    },
  };
}

export function loginWithCredentialsViaBff(rawJsonText: string): {
  status: number;
  body: AuthSessionPayload | AuthSecurityError | ValidationError;
  setCookie?: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch {
    return { status: 400, body: validationErr("Malformed JSON login payload.", "body") };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { status: 400, body: validationErr("Request body must be a JSON object.", "body") };
  }

  const obj = parsed as Record<string, unknown>;
  const email = typeof obj.email === "string" ? obj.email.trim().toLowerCase() : "";
  const password = typeof obj.password === "string" ? obj.password : "";
  const requestedWs = typeof obj.workspaceId === "string" ? obj.workspaceId.trim() : null;
  if (!email || !password) {
    return { status: 400, body: validationErr("Email and password are required.", "email") };
  }

  const state = getLocalAuthState();
  const now = Date.now();
  const recentFailures = (state.failedAttempts.get(email) ?? []).filter((ts) => now - ts < 60_000);
  if (recentFailures.length >= 5) {
    state.failedAttempts.set(email, recentFailures);
    return {
      status: 429,
      body: authError(
        "RateLimitExceededError",
        "RATE_LIMIT_EXCEEDED",
        "Too many failed sign-in attempts. Please wait 60 seconds and retry.",
      ),
    };
  }

  const user = state.users.find((u) => u.email.toLowerCase() === email);
  if (!user || !verifyPasswordScrypt(password, user.passwordPhc)) {
    recentFailures.push(now);
    state.failedAttempts.set(email, recentFailures);
    return {
      status: 401,
      body: authError("AuthenticationError", "INVALID_CREDENTIALS", "Invalid email or password."),
    };
  }

  state.failedAttempts.delete(email);
  const membership = state.memberships.find(
    (m) =>
      m.userId === user.id &&
      m.isActive &&
      (requestedWs ? m.workspaceId === requestedWs : true),
  );
  if (!membership) {
    return {
      status: 403,
      body: authError("AuthorizationError", "AUTHORIZATION_ERROR", "No active workspace membership found."),
    };
  }

  const workspace = state.workspaces.find((w) => w.id === membership.workspaceId)!;
  const nowSec = Math.floor(Date.now() / 1000);
  const token = signToken(
    {
      sub: user.id,
      ws: workspace.id,
      role: membership.role,
      jti: randomUUID(),
      iat: nowSec,
      exp: nowSec + 900,
    },
    state.signingSecret,
  );

  appendImmutableEvent(state, {
    workspaceId: workspace.id,
    actorUserId: user.id,
    actorRole: membership.role,
    action: "AUTH_LOGIN_SUCCESS",
    entityType: "Session",
    entityId: user.id,
    payload: { email: user.email, role: membership.role },
  });

  return {
    status: 200,
    body: buildSessionPayload(state, user, workspace, membership.role),
    setCookie: formatSessionCookieHeader(token, 900),
  };
}

export function getSessionFromRequestViaBff(request: NextRequest | Request): {
  status: number;
  body: AuthSessionPayload | AuthSecurityError;
} {
  const state = getLocalAuthState();
  const rawToken = extractSessionToken(request);
  if (!rawToken) {
    // Allow initial UI hydration with demo Owner view ONLY when no tampered cookie is supplied and strict flag not set
    if (request.headers.get("x-require-auth") === "1") {
      return {
        status: 401,
        body: authError("AuthenticationError", "AUTHENTICATION_ERROR", "No active session."),
      };
    }
    const defaultUser = state.users[0]!;
    const defaultWs = state.workspaces[0]!;
    return {
      status: 200,
      body: buildSessionPayload(state, defaultUser, defaultWs, "OWNER_MANAGING_DIRECTOR"),
    };
  }

  const claims = verifyToken(rawToken, state.signingSecret);
  if (!claims) {
    return {
      status: 401,
      body: authError("AuthenticationError", "AUTHENTICATION_ERROR", "Invalid or expired session cookie."),
    };
  }

  const user = state.users.find((u) => u.id === claims.sub);
  const membership = state.memberships.find(
    (m) => m.userId === claims.sub && m.workspaceId === claims.ws && m.isActive,
  );
  const workspace = state.workspaces.find((w) => w.id === claims.ws);
  if (!user || !membership || !workspace) {
    return {
      status: 401,
      body: authError("AuthenticationError", "AUTHENTICATION_ERROR", "Session membership inactive."),
    };
  }

  return {
    status: 200,
    body: buildSessionPayload(state, user, workspace, membership.role),
  };
}

export function switchWorkspaceViaBff(
  request: NextRequest | Request,
  rawJsonText: string,
): {
  status: number;
  body: AuthSessionPayload | AuthSecurityError | ValidationError;
  setCookie?: string;
} {
  const state = getLocalAuthState();
  const rawToken = extractSessionToken(request);
  if (!rawToken) {
    return {
      status: 401,
      body: authError("AuthenticationError", "AUTHENTICATION_ERROR", "Sign in required to switch workspaces."),
    };
  }
  const claims = verifyToken(rawToken, state.signingSecret);
  if (!claims) {
    return {
      status: 401,
      body: authError("AuthenticationError", "AUTHENTICATION_ERROR", "Invalid or expired session."),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch {
    return { status: 400, body: validationErr("Malformed JSON payload.", "body") };
  }
  const workspaceId =
    parsed !== null && typeof parsed === "object" && "workspaceId" in parsed
      ? String((parsed as { workspaceId: unknown }).workspaceId ?? "").trim()
      : "";
  if (!workspaceId) {
    return { status: 400, body: validationErr("workspaceId is required.", "workspaceId") };
  }

  const targetMembership = state.memberships.find(
    (m) => m.userId === claims.sub && m.workspaceId === workspaceId && m.isActive,
  );
  const targetWorkspace = state.workspaces.find((w) => w.id === workspaceId);
  const user = state.users.find((u) => u.id === claims.sub);
  if (!targetMembership || !targetWorkspace || !user) {
    return {
      status: 403,
      body: authError(
        "AuthorizationError",
        "AUTHORIZATION_ERROR",
        "User does not hold an active membership in target workspace.",
      ),
    };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const rotatedToken = signToken(
    {
      sub: user.id,
      ws: targetWorkspace.id,
      role: targetMembership.role,
      jti: randomUUID(),
      iat: nowSec,
      exp: nowSec + 900,
    },
    state.signingSecret,
  );

  appendImmutableEvent(state, {
    workspaceId: targetWorkspace.id,
    actorUserId: user.id,
    actorRole: targetMembership.role,
    action: "AUTH_WORKSPACE_SWITCHED",
    entityType: "Workspace",
    entityId: targetWorkspace.id,
    payload: { previousWorkspaceId: claims.ws, nextWorkspaceId: targetWorkspace.id },
  });

  return {
    status: 200,
    body: buildSessionPayload(state, user, targetWorkspace, targetMembership.role),
    setCookie: formatSessionCookieHeader(rotatedToken, 900),
  };
}

export function listWorkspaceMembersViaBff(workspaceId: string): WorkspaceMemberRecord[] {
  const state = getLocalAuthState();
  return state.memberships
    .filter((m) => m.workspaceId === workspaceId)
    .map((m) => {
      const user = state.users.find((u) => u.id === m.userId)!;
      return {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        role: m.role,
        frcRegNumber: user.frcRegNumber,
        isActive: m.isActive,
      };
    });
}

export function assignWorkspaceMemberViaBff(
  ctx: AuthorizedActorContext,
  rawJsonText: string,
): { status: number; body: WorkspaceMemberRecord | ValidationError | AuthSecurityError } {
  if (!ctx.permissions.includes("MEMBERS_MANAGE")) {
    return {
      status: 403,
      body: authError(
        "AuthorizationError",
        "AUTHORIZATION_ERROR",
        "Only Workspace Owners can invite or change member roles.",
      ),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch {
    return { status: 400, body: validationErr("Malformed JSON payload.", "body") };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { status: 400, body: validationErr("Request body must be a JSON object.", "body") };
  }

  const obj = parsed as Record<string, unknown>;
  const email = typeof obj.email === "string" ? obj.email.trim().toLowerCase() : "";
  const fullName = typeof obj.fullName === "string" ? obj.fullName.trim() : "";
  const role = typeof obj.role === "string" ? (obj.role as ActorRole) : null;
  const frcRegNumber =
    typeof obj.frcRegNumber === "string" && obj.frcRegNumber.trim()
      ? obj.frcRegNumber.trim()
      : null;

  if (!email.includes("@")) {
    return { status: 400, body: validationErr("Valid member email is required.", "email") };
  }
  if (!fullName) {
    return { status: 400, body: validationErr("Member full name is required.", "fullName") };
  }
  if (!role || !ROLE_PERMISSIONS[role]) {
    return { status: 400, body: validationErr("Valid RBAC ActorRole is required.", "role") };
  }

  const state = getLocalAuthState();
  let user = state.users.find((u) => u.email.toLowerCase() === email);
  if (!user) {
    user = {
      id: randomUUID(),
      email,
      fullName,
      passwordPhc: hashPasswordScrypt("NairaBooks#2026"),
      frcRegNumber,
    };
    state.users.push(user);
  } else if (frcRegNumber) {
    user.frcRegNumber = frcRegNumber;
  }

  const existingMembership = state.memberships.find(
    (m) => m.workspaceId === ctx.workspaceId && m.userId === user!.id,
  );
  if (existingMembership) {
    existingMembership.role = role;
    existingMembership.isActive = true;
  } else {
    state.memberships.push({
      workspaceId: ctx.workspaceId,
      userId: user.id,
      role,
      isActive: true,
    });
  }

  appendImmutableEvent(state, {
    workspaceId: ctx.workspaceId,
    actorUserId: ctx.userId,
    actorRole: ctx.role,
    action: "WORKSPACE_MEMBER_ASSIGNED",
    entityType: "WorkspaceMember",
    entityId: user.id,
    payload: { email: user.email, assignedRole: role },
  });

  return {
    status: 201,
    body: {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role,
      frcRegNumber: user.frcRegNumber,
      isActive: true,
    },
  };
}

export function recordAuditTrailForMutation(input: {
  workspaceId: string;
  actorUserId: string;
  actorRole: ActorRole;
  action: string;
  entityType: string;
  entityId: string;
  payload: unknown;
}): AuditEventRecord {
  return appendImmutableEvent(getLocalAuthState(), input);
}

export function listAuditEventsViaBff(workspaceId: string, first = 50): AuditEventRecord[] {
  const safeLimit = Math.max(1, Math.min(200, first));
  return getLocalAuthState()
    .auditEvents.filter((e) => e.workspaceId === workspaceId)
    .slice(-safeLimit)
    .reverse();
}

export function verifyAuditChainViaBff(workspaceId: string): AuditChainVerification {
  const events = getLocalAuthState().auditEvents.filter((e) => e.workspaceId === workspaceId);
  let expectedPrev = GENESIS_HASH;
  for (const evt of events) {
    if (evt.previousHash !== expectedPrev) {
      return {
        isValid: false,
        verifiedCount: 0,
        latestEventHash: evt.eventHash,
        brokenAtEventId: evt.id,
      };
    }
    const recomputed = computeEventHash({
      previousHash: evt.previousHash,
      workspaceId: evt.workspaceId,
      actorUserId: evt.actorUserId,
      actorRole: evt.actorRole,
      action: evt.action,
      entityType: evt.entityType,
      entityId: evt.entityId,
      payloadHash: evt.payloadHash,
      occurredAt: evt.occurredAt,
    });
    if (recomputed !== evt.eventHash) {
      return {
        isValid: false,
        verifiedCount: 0,
        latestEventHash: evt.eventHash,
        brokenAtEventId: evt.id,
      };
    }
    expectedPrev = evt.eventHash;
  }
  const tailEvent = events[events.length - 1];
  return {
    isValid: true,
    verifiedCount: events.length,
    latestEventHash: tailEvent ? tailEvent.eventHash : null,
    brokenAtEventId: null,
  };
}

export function listCamaCertificationsViaBff(
  workspaceId: string,
): CamaSec405CertificationRecord[] {
  return getLocalAuthState().camaCertifications.filter(
    (c) => c.workspaceId === workspaceId,
  );
}

export async function certifyCamaSec405ViaBff(
  ctx: AuthorizedActorContext,
  rawJsonText: string,
): Promise<{
  status: number;
  body:
    | { period: Awaited<ReturnType<typeof certifyPeriodCamaInLocalLedger>>["period"]; certification: CamaSec405CertificationRecord }
    | SegregationOfDutiesError
    | AuthSecurityError
    | ValidationError;
}> {
  if (!ctx.permissions.includes("AUDIT_CAMA_CERTIFY")) {
    return {
      status: 403,
      body: authError(
        "AuthorizationError",
        "AUTHORIZATION_ERROR",
        `Role '${ctx.role}' cannot execute CAMA 2020 Section 405 statutory certification.`,
      ),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch {
    return { status: 400, body: validationErr("Malformed JSON payload.", "body") };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { status: 400, body: validationErr("Request body must be a JSON object.", "body") };
  }

  const obj = parsed as Record<string, unknown>;
  const periodId = typeof obj.periodId === "string" ? obj.periodId.trim() : "";
  const preparedByUserId =
    typeof obj.preparedByUserId === "string" ? obj.preparedByUserId.trim() : "";
  const certifierFrcNumber =
    typeof obj.certifierFrcNumber === "string" ? obj.certifierFrcNumber.trim() : "";
  const certifierDesignationRaw =
    typeof obj.certifierDesignation === "string" ? obj.certifierDesignation.trim() : "";
  const professionalBodyNumber =
    typeof obj.professionalBodyNumber === "string" ? obj.professionalBodyNumber.trim() : "";
  const accepted = obj.camaDeclarationAccepted === true;

  if (!periodId) {
    return { status: 400, body: validationErr("periodId is required.", "periodId") };
  }
  if (!preparedByUserId) {
    return {
      status: 400,
      body: validationErr("preparedByUserId is required for Segregation of Duties.", "preparedByUserId"),
    };
  }
  if (!certifierFrcNumber.startsWith("FRC/")) {
    return {
      status: 400,
      body: validationErr(
        "Valid Financial Reporting Council registration number (e.g. FRC/2026/000991) is required.",
        "certifierFrcNumber",
      ),
    };
  }
  if (
    certifierDesignationRaw !== "OWNER_MANAGING_DIRECTOR" &&
    certifierDesignationRaw !== "CHARTERED_ACCOUNTANT_CFO"
  ) {
    return {
      status: 400,
      body: validationErr(
        "certifierDesignation must be OWNER_MANAGING_DIRECTOR or CHARTERED_ACCOUNTANT_CFO.",
        "certifierDesignation",
      ),
    };
  }
  if (!professionalBodyNumber) {
    return {
      status: 400,
      body: validationErr("ICAN/ANAN membership number is required.", "professionalBodyNumber"),
    };
  }
  if (!accepted) {
    return {
      status: 400,
      body: validationErr(
        "CAMA 2020 Section 405 statutory truth-and-fairness declaration must be accepted.",
        "camaDeclarationAccepted",
      ),
    };
  }

  if (preparedByUserId === ctx.userId) {
    return {
      status: 403,
      body: {
        __typename: "SegregationOfDutiesError",
        code: "SEGREGATION_OF_DUTIES_VIOLATION",
        message:
          "Segregation of Duties violated: the preparer of the period financial statements cannot self-certify under CAMA Sec 405.",
        requiredRole: "CHARTERED_ACCOUNTANT_CFO",
      },
    };
  }

  try {
    const label = `${certifierDesignationRaw} (${certifierFrcNumber})`;
    const { period, snapshotHash } = await certifyPeriodCamaInLocalLedger(periodId, label);
    const certRecord: CamaSec405CertificationRecord = Object.freeze({
      id: randomUUID(),
      workspaceId: ctx.workspaceId,
      periodId: period.id,
      periodLabel: period.label,
      financialStatementsHash: snapshotHash,
      preparedByUserId,
      certifiedByUserId: ctx.userId,
      certifierDesignation: certifierDesignationRaw,
      certifierFrcNumber,
      professionalBodyNumber,
      camaDeclarationAccepted: true,
      certifiedAt: new Date().toISOString(),
    });

    const state = getLocalAuthState();
    state.camaCertifications.push(certRecord);

    appendImmutableEvent(state, {
      workspaceId: ctx.workspaceId,
      actorUserId: ctx.userId,
      actorRole: ctx.role,
      action: "CAMA_SEC405_CERTIFICATION",
      entityType: "FiscalPeriod",
      entityId: period.id,
      payload: {
        periodLabel: period.label,
        financialStatementsHash: snapshotHash,
        preparedByUserId,
        certifiedByUserId: ctx.userId,
        certifierFrcNumber,
      },
    });

    return {
      status: 201,
      body: {
        period,
        certification: certRecord,
      },
    };
  } catch (err) {
    return {
      status: 400,
      body: validationErr(
        err instanceof Error ? err.message : "Failed to certify fiscal period.",
        "periodId",
      ),
    };
  }
}

export async function fetchSecurityWorkspaceInitialData(): Promise<SecurityWorkspaceInitialData> {
  const state = getLocalAuthState();
  const owner = state.users[0]!;
  const primaryWs = state.workspaces[0]!;
  const periods = await fetchFiscalPeriods();
  return {
    session: buildSessionPayload(state, owner, primaryWs, "OWNER_MANAGING_DIRECTOR"),
    members: listWorkspaceMembersViaBff(PRIMARY_WORKSPACE_ID),
    periods,
    auditEvents: listAuditEventsViaBff(PRIMARY_WORKSPACE_ID, 50),
    chainVerification: verifyAuditChainViaBff(PRIMARY_WORKSPACE_ID),
    camaCertifications: listCamaCertificationsViaBff(PRIMARY_WORKSPACE_ID),
  };
}

export function getOptionalSessionFromToken(rawToken?: string): AuthSessionPayload | null {
  if (!rawToken) {
    return null;
  }
  const state = getLocalAuthState();
  const claims = verifyToken(rawToken, state.signingSecret);
  if (!claims) {
    return null;
  }
  const user = state.users.find((u) => u.id === claims.sub);
  const membership = state.memberships.find(
    (m) => m.userId === claims.sub && m.workspaceId === claims.ws && m.isActive,
  );
  const workspace = state.workspaces.find((w) => w.id === claims.ws);
  if (!user || !membership || !workspace) {
    return null;
  }
  return buildSessionPayload(state, user, workspace, membership.role);
}

export function registerWorkspaceAccountViaBff(rawJsonText: string): {
  status: number;
  body: AuthSessionPayload | ValidationError | AuthSecurityError;
  setCookie?: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch {
    return { status: 400, body: validationErr("Malformed JSON registration payload.", "body") };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { status: 400, body: validationErr("Request body must be a JSON object.", "body") };
  }

  const obj = parsed as Record<string, unknown>;
  const fullName = typeof obj.fullName === "string" ? obj.fullName.trim() : "";
  const email = typeof obj.email === "string" ? obj.email.trim().toLowerCase() : "";
  const password = typeof obj.password === "string" ? obj.password : "";
  const workspaceName =
    typeof obj.workspaceName === "string" ? obj.workspaceName.trim() : "";
  const rcNumber =
    typeof obj.rcNumber === "string" && obj.rcNumber.trim()
      ? obj.rcNumber.trim()
      : "RC PENDING";
  const businessType =
    typeof obj.businessType === "string" && obj.businessType.trim()
      ? obj.businessType.trim()
      : "RETAIL_ECOMMERCE";
  const legalStructure =
    typeof obj.legalStructure === "string" && obj.legalStructure.trim()
      ? obj.legalStructure.trim()
      : "LIMITED_COMPANY";
  const tinNumber =
    typeof obj.tinNumber === "string" && obj.tinNumber.trim()
      ? obj.tinNumber.trim()
      : null;
  const businessState =
    typeof obj.state === "string" && obj.state.trim() ? obj.state.trim() : "Lagos";
  const address =
    typeof obj.address === "string" && obj.address.trim() ? obj.address.trim() : null;
  const setupMethod =
    typeof obj.setupMethod === "string" && obj.setupMethod.trim()
      ? obj.setupMethod.trim()
      : "INDUSTRY_TEMPLATE";
  const customModules = Array.isArray(obj.customModules)
    ? obj.customModules.filter((m): m is string => typeof m === "string" && m.trim().length > 0)
    : [];
  const accountingMethod =
    obj.accountingMethod === "CASH" ? "CASH" : "ACCRUAL";
  const postingMethod =
    obj.postingMethod === "BATCH" ? "BATCH" : "REAL_TIME";
  const periodStructure =
    obj.periodStructure === "QUARTERLY_13" ? "QUARTERLY_13" : "MONTHLY_12";
  const fiscalStartMonth =
    typeof obj.fiscalStartMonth === "string" && obj.fiscalStartMonth.trim()
      ? obj.fiscalStartMonth.trim()
      : "January";
  const fiscalYear =
    typeof obj.fiscalYear === "number" && Number.isInteger(obj.fiscalYear)
      ? obj.fiscalYear
      : 2026;
  const turnoverBand =
    typeof obj.turnoverBand === "string" && obj.turnoverBand.trim()
      ? obj.turnoverBand.trim()
      : "UNDER_100M";

  if (!fullName || fullName.length < 2) {
    return { status: 400, body: validationErr("Your full name is required.", "fullName") };
  }
  if (!email.includes("@")) {
    return { status: 400, body: validationErr("A valid work email address is required.", "email") };
  }
  if (password.length < 8) {
    return {
      status: 400,
      body: validationErr("Password must be at least 8 characters long.", "password"),
    };
  }
  if (!workspaceName || workspaceName.length < 2) {
    return {
      status: 400,
      body: validationErr("Business legal name is required.", "workspaceName"),
    };
  }

  const state = getLocalAuthState();
  if (state.users.some((u) => u.email.toLowerCase() === email)) {
    return {
      status: 409,
      body: validationErr("An account with this email address already exists.", "email"),
    };
  }

  const userId = randomUUID();
  const workspaceId = randomUUID();
  const newUser: InternalUserRecord = {
    id: userId,
    email,
    fullName,
    passwordPhc: hashPasswordScrypt(password),
    frcRegNumber: null,
  };
  const newWorkspace: AuthWorkspaceSummary = {
    id: workspaceId,
    legalName: workspaceName,
    rcNumber,
    baseCurrency: "NGN",
  };

  state.users.push(newUser);
  state.workspaces.push(newWorkspace);
  state.memberships.push({
    workspaceId,
    userId,
    role: "OWNER_MANAGING_DIRECTOR",
    isActive: true,
  });

  appendImmutableEvent(state, {
    workspaceId,
    actorUserId: userId,
    actorRole: "OWNER_MANAGING_DIRECTOR",
    action: "WORKSPACE_REGISTERED",
    entityType: "Workspace",
    entityId: workspaceId,
    payload: {
      legalName: workspaceName,
      rcNumber,
      tinNumber,
      legalStructure,
      state: businessState,
      address,
      businessType,
      setupMethod,
      customModules,
      accountingMethod,
      postingMethod,
      periodStructure,
      fiscalStartMonth,
      fiscalYear,
      turnoverBand,
      ownerEmail: email,
    },
  });

  appendImmutableEvent(state, {
    workspaceId,
    actorUserId: userId,
    actorRole: "OWNER_MANAGING_DIRECTOR",
    action: "AUTH_LOGIN_SUCCESS",
    entityType: "Session",
    entityId: userId,
    payload: { email, role: "OWNER_MANAGING_DIRECTOR" },
  });

  const nowSec = Math.floor(Date.now() / 1000);
  const token = signToken(
    {
      sub: userId,
      ws: workspaceId,
      role: "OWNER_MANAGING_DIRECTOR",
      jti: randomUUID(),
      iat: nowSec,
      exp: nowSec + 900,
    },
    state.signingSecret,
  );

  return {
    status: 201,
    body: buildSessionPayload(state, newUser, newWorkspace, "OWNER_MANAGING_DIRECTOR"),
    setCookie: formatSessionCookieHeader(token, 900),
  };
}
