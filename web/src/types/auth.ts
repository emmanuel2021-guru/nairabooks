import type { ActorRole, FiscalPeriod, SegregationOfDutiesError } from "./ledger";

export type { ActorRole, SegregationOfDutiesError };

export type Permission =
  | "LEDGER_READ"
  | "LEDGER_POST"
  | "LEDGER_REVERSE"
  | "LEDGER_PERIOD_CLOSE"
  | "TAX_READ"
  | "TAX_WRITE"
  | "PACKS_READ"
  | "PACKS_WRITE"
  | "AUDIT_READ"
  | "AUDIT_CAMA_CERTIFY"
  | "MEMBERS_MANAGE";

export interface AuthUserSummary {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly role: ActorRole;
  readonly designation: ActorRole;
  readonly frcRegNumber: string | null;
}

export interface AuthWorkspaceSummary {
  readonly id: string;
  readonly legalName: string;
  readonly rcNumber: string;
  readonly baseCurrency: "NGN";
}

export interface WorkspaceMembershipSummary {
  readonly id: string;
  readonly legalName: string;
  readonly rcNumber: string;
  readonly role: ActorRole;
}

export interface AuthSessionPayload {
  readonly authenticated: boolean;
  readonly user: AuthUserSummary | null;
  readonly workspace: AuthWorkspaceSummary | null;
  readonly availableWorkspaces: readonly WorkspaceMembershipSummary[];
  readonly permissions: readonly Permission[];
}

export interface WorkspaceMemberRecord {
  readonly userId: string;
  readonly email: string;
  readonly fullName: string;
  readonly role: ActorRole;
  readonly frcRegNumber: string | null;
  readonly isActive: boolean;
}

export interface AuditEventRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly actorUserId: string;
  readonly actorRole: ActorRole;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly payloadHash: string;
  readonly previousHash: string;
  readonly eventHash: string;
  readonly occurredAt: string;
}

export interface AuditChainVerification {
  readonly isValid: boolean;
  readonly verifiedCount: number;
  readonly latestEventHash: string | null;
  readonly brokenAtEventId: string | null;
}

export interface CamaSec405CertificationRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly periodId: string;
  readonly periodLabel: string;
  readonly financialStatementsHash: string;
  readonly preparedByUserId: string;
  readonly certifiedByUserId: string;
  readonly certifierDesignation: "OWNER_MANAGING_DIRECTOR" | "CHARTERED_ACCOUNTANT_CFO";
  readonly certifierFrcNumber: string;
  readonly professionalBodyNumber: string;
  readonly camaDeclarationAccepted: boolean;
  readonly certifiedAt: string;
}

export interface SecurityWorkspaceInitialData {
  readonly session: AuthSessionPayload;
  readonly members: readonly WorkspaceMemberRecord[];
  readonly periods: readonly FiscalPeriod[];
  readonly auditEvents: readonly AuditEventRecord[];
  readonly chainVerification: AuditChainVerification;
  readonly camaCertifications: readonly CamaSec405CertificationRecord[];
}
