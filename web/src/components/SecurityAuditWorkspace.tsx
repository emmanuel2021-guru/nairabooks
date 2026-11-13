"use client";

import React, { useState } from "react";
import { useWorkspaceMode } from "@/state/workspace-mode";
import type {
  ActorRole,
  AuditChainVerification,
  AuditEventRecord,
  AuthSessionPayload,
  CamaSec405CertificationRecord,
  SecurityWorkspaceInitialData,
  WorkspaceMemberRecord,
} from "@/types/auth";
import type { FiscalPeriod } from "@/types/ledger";

const ROLE_LABELS: Record<ActorRole, string> = {
  OWNER_MANAGING_DIRECTOR: "Owner / Managing Director",
  CHARTERED_ACCOUNTANT_CFO: "Chartered Accountant (CFO)",
  BOOKKEEPER: "Bookkeeper / Clerk",
  BRANCH_OUTLET_CASHIER: "Branch / Outlet Cashier",
  EXTERNAL_AUDITOR_READONLY: "External Auditor (Read-Only)",
};

const ROLE_MATRIX_ROWS: readonly {
  role: ActorRole;
  ledgerPost: string;
  ledgerReverse: string;
  auditRead: string;
  camaCertify: string;
  manageTeam: string;
}[] = [
  {
    role: "OWNER_MANAGING_DIRECTOR",
    ledgerPost: "Allowed",
    ledgerReverse: "Allowed",
    auditRead: "Allowed",
    camaCertify: "Allowed (SoD)",
    manageTeam: "Allowed",
  },
  {
    role: "CHARTERED_ACCOUNTANT_CFO",
    ledgerPost: "Allowed",
    ledgerReverse: "Allowed",
    auditRead: "Allowed",
    camaCertify: "Allowed (SoD)",
    manageTeam: "Restricted",
  },
  {
    role: "BOOKKEEPER",
    ledgerPost: "Allowed",
    ledgerReverse: "Denied",
    auditRead: "Denied",
    camaCertify: "Denied",
    manageTeam: "Denied",
  },
  {
    role: "BRANCH_OUTLET_CASHIER",
    ledgerPost: "POS/Cash Only",
    ledgerReverse: "Denied",
    auditRead: "Denied",
    camaCertify: "Denied",
    manageTeam: "Denied",
  },
  {
    role: "EXTERNAL_AUDITOR_READONLY",
    ledgerPost: "Read-Only",
    ledgerReverse: "Denied",
    auditRead: "Allowed",
    camaCertify: "Denied",
    manageTeam: "Denied",
  },
];

export function SecurityAuditWorkspace({
  initialData,
}: {
  initialData: SecurityWorkspaceInitialData;
}) {
  const { mode } = useWorkspaceMode();

  const [session, setSession] = useState<AuthSessionPayload>(initialData.session);
  const [members, setMembers] = useState<readonly WorkspaceMemberRecord[]>(initialData.members);
  const [periods, setPeriods] = useState<readonly FiscalPeriod[]>(initialData.periods);
  const [auditEvents, setAuditEvents] = useState<readonly AuditEventRecord[]>(
    initialData.auditEvents,
  );
  const [chainVerification, setChainVerification] = useState<AuditChainVerification>(
    initialData.chainVerification,
  );
  const [camaCertifications, setCamaCertifications] = useState<
    readonly CamaSec405CertificationRecord[]
  >(initialData.camaCertifications);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sign-in form
  const [loginEmail, setLoginEmail] = useState("cfo@lagostrading.ng");
  const [loginPassword, setLoginPassword] = useState("NairaBooks#2026");

  // Invite team member form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteRole, setInviteRole] = useState<ActorRole>("BOOKKEEPER");

  // CAMA Sec 405 certification form
  const firstOpenPeriod =
    periods.find((p) => p.status === "OPEN")?.id ?? periods[0]?.id ?? "";
  const [camaPeriodId, setCamaPeriodId] = useState(firstOpenPeriod);
  const [preparedByUserId, setPreparedByUserId] = useState(
    initialData.members.find((m) => m.role === "BOOKKEEPER")?.userId ??
      initialData.members[0]?.userId ??
      "",
  );
  const [frcRegNumber, setFrcRegNumber] = useState("FRC/2026/000991");
  const [professionalBodyNo, setProfessionalBodyNo] = useState("ICAN-2026-00421");
  const [certDesignation, setCertDesignation] = useState<
    "OWNER_MANAGING_DIRECTOR" | "CHARTERED_ACCOUNTANT_CFO"
  >("CHARTERED_ACCOUNTANT_CFO");
  const [camaAccepted, setCamaAccepted] = useState(true);

  async function refreshSecurityState() {
    const [sessRes, membersRes, periodsRes, eventsRes, verifyRes, camaRes] = await Promise.all([
      fetch("/api/auth/session", { cache: "no-store" }),
      fetch("/api/auth/members", { cache: "no-store" }),
      fetch("/api/ledger/periods", { cache: "no-store" }),
      fetch("/api/audit/events?first=50", { cache: "no-store" }),
      fetch("/api/audit/verify", { cache: "no-store" }),
      fetch("/api/audit/cama-certifications", { cache: "no-store" }),
    ]);

    if (sessRes.ok) {
      setSession((await sessRes.json()) as AuthSessionPayload);
    }
    if (membersRes.ok) {
      const mData = (await membersRes.json()) as { items: WorkspaceMemberRecord[] };
      setMembers(mData.items);
    }
    if (periodsRes.ok) {
      const pData = (await periodsRes.json()) as { items: FiscalPeriod[] };
      setPeriods(pData.items);
    }
    if (eventsRes.ok) {
      const eData = (await eventsRes.json()) as { items: AuditEventRecord[] };
      setAuditEvents(eData.items);
    } else {
      setAuditEvents([]);
    }
    if (verifyRes.ok) {
      setChainVerification((await verifyRes.json()) as AuditChainVerification);
    }
    if (camaRes.ok) {
      const cData = (await camaRes.json()) as { items: CamaSec405CertificationRecord[] };
      setCamaCertifications(cData.items);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });
    const body = (await res.json()) as { message?: string; user?: { fullName: string; role: ActorRole } };
    if (!res.ok) {
      setErrorMessage(body.message ?? "Sign-in failed.");
      return;
    }
    setStatusMessage(
      `Signed in as ${body.user?.fullName ?? loginEmail} (${body.user ? ROLE_LABELS[body.user.role] : "Active"}).`,
    );
    await refreshSecurityState();
  }

  async function handleSwitchWorkspace(workspaceId: string) {
    setErrorMessage(null);
    setStatusMessage(null);
    const res = await fetch("/api/auth/switch-workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
    const body = (await res.json()) as {
      message?: string;
      workspace?: { legalName: string };
    };
    if (!res.ok) {
      setErrorMessage(body.message ?? "Unable to switch workspace.");
      return;
    }
    setStatusMessage(`Switched active tenant to ${body.workspace?.legalName ?? workspaceId}.`);
    await refreshSecurityState();
  }

  async function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    const res = await fetch("/api/auth/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: inviteEmail,
        fullName: inviteFullName,
        role: inviteRole,
      }),
    });
    const body = (await res.json()) as { message?: string; email?: string };
    if (!res.ok) {
      setErrorMessage(body.message ?? "Unable to add team member.");
      return;
    }
    setInviteEmail("");
    setInviteFullName("");
    setStatusMessage(`Assigned workspace access for ${body.email ?? "new member"}.`);
    await refreshSecurityState();
  }

  async function handleCamaCertify(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    const res = await fetch("/api/audit/cama-certifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodId: camaPeriodId,
        preparedByUserId,
        certifierFrcNumber: frcRegNumber,
        certifierDesignation: certDesignation,
        professionalBodyNumber: professionalBodyNo,
        camaDeclarationAccepted: camaAccepted,
      }),
    });
    const body = (await res.json()) as {
      message?: string;
      period?: FiscalPeriod;
      certification?: CamaSec405CertificationRecord;
    };
    if (!res.ok) {
      setErrorMessage(body.message ?? "CAMA Sec 405 certification rejected.");
      return;
    }
    setStatusMessage(
      `Certified ${body.period?.label ?? "period"} under CAMA 2020 Sec 405 (${body.certification?.certifierFrcNumber ?? ""}).`,
    );
    await refreshSecurityState();
  }

  async function handleVerifyChain() {
    setErrorMessage(null);
    const res = await fetch("/api/audit/verify", { cache: "no-store" });
    if (!res.ok) {
      const err = (await res.json()) as { message?: string };
      setErrorMessage(err.message ?? "You do not have permission to verify the audit log.");
      return;
    }
    const ver = (await res.json()) as AuditChainVerification;
    setChainVerification(ver);
    setStatusMessage(
      ver.isValid
        ? `Audit hash chain verified across ${ver.verifiedCount} immutable events.`
        : `Tampering detected at event ${ver.brokenAtEventId ?? "unknown"}.`,
    );
  }

  const activeUser = session.user;
  const activeWs = session.workspace;
  const canReadAudit = session.permissions.includes("AUDIT_READ");
  const canCertifyCama = session.permissions.includes("AUDIT_CAMA_CERTIFY");
  const canManageMembers = session.permissions.includes("MEMBERS_MANAGE");
  const latestCert =
    camaCertifications.length > 0 ? camaCertifications[camaCertifications.length - 1] : undefined;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-6 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            CAMA 2020 Governance &amp; Security
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900">
            Access Control, Sessions &amp; CAMA Audit Trail
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            {mode === "simple"
              ? "Manage who can record sales, approve filings, lock fiscal years, and inspect company records safely."
              : "HttpOnly workspace-scoped sessions, 5-role RBAC enforcement, CAMA Sec 405 Segregation of Duties, and SHA-256 hash-chained audit telemetry."}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <p className="font-semibold">
            {activeUser ? `${activeUser.fullName} · ${ROLE_LABELS[activeUser.role]}` : "Not signed in"}
          </p>
          <p className="text-xs text-emerald-800">
            {activeWs ? `${activeWs.legalName} (${activeWs.rcNumber})` : "No active workspace"}
          </p>
        </div>
      </header>

      {statusMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="mb-5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
        >
          {statusMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900"
        >
          {errorMessage}
        </div>
      ) : null}

      <section
        aria-labelledby="session-switcher-heading"
        className="mb-6 grid gap-6 md:grid-cols-2"
      >
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 id="session-switcher-heading" className="text-lg font-semibold text-stone-900">
            1. Sign In or Switch Role Persona
          </h2>
          <p className="mt-1 text-xs text-stone-600">
            Demo password for all 5 Nigerian roles: <code>NairaBooks#2026</code>
          </p>
          <form onSubmit={handleLogin} className="mt-4 space-y-3">
            <div>
              <label htmlFor="auth-login-email" className="block text-sm font-medium text-stone-800">
                Staff or Auditor Email
              </label>
              <select
                id="auth-login-email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900"
              >
                <option value="owner@lagostrading.ng">
                  owner@lagostrading.ng — Owner / MD (Adaeze Nwosu)
                </option>
                <option value="cfo@lagostrading.ng">
                  cfo@lagostrading.ng — Chartered Accountant CFO (Tunde Bakare FCA)
                </option>
                <option value="clerk@lagostrading.ng">
                  clerk@lagostrading.ng — Bookkeeper (Amina Ibrahim)
                </option>
                <option value="cashier@lagostrading.ng">
                  cashier@lagostrading.ng — Branch Cashier (Seyi Ogunleye)
                </option>
                <option value="auditor@icanaudit.ng">
                  auditor@icanaudit.ng — External Auditor (Ngozi Eze FCA)
                </option>
              </select>
            </div>
            <div>
              <label
                htmlFor="auth-login-password"
                className="block text-sm font-medium text-stone-800"
              >
                Passphrase
              </label>
              <input
                id="auth-login-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 text-sm text-stone-900"
                required
              />
            </div>
            <button
              type="submit"
              className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Authenticate Session Cookie
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">2. Multi-Company Workspace Switcher</h2>
          <p className="mt-1 text-xs text-stone-600">
            Switching rotates your HTTP-only session cookie so books never leak between Nigerian companies.
          </p>
          <div className="mt-4 space-y-2">
            {session.availableWorkspaces.map((ws) => {
              const isCurrent = ws.id === activeWs?.id;
              return (
                <div
                  key={ws.id}
                  className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{ws.legalName}</p>
                    <p className="text-xs text-stone-600">
                      {ws.rcNumber} · Role: {ROLE_LABELS[ws.role]}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isCurrent}
                    onClick={() => handleSwitchWorkspace(ws.id)}
                    className={`min-h-11 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      isCurrent
                        ? "bg-emerald-100 text-emerald-900"
                        : "border border-stone-300 bg-white text-stone-800 hover:bg-stone-100"
                    }`}
                  >
                    {isCurrent ? "Active Workspace" : "Switch Here"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="cama-cert-heading"
        className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="cama-cert-heading" className="text-lg font-semibold text-stone-900">
              3. CAMA 2020 Section 405 Statutory Financial Sign-Off
            </h2>
            <p className="text-xs text-stone-600">
              Enforces Segregation of Duties: financial statements prepared by a Clerk must be certified by a distinct CFO or Managing Director.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            {canCertifyCama ? "Certifier Authorized" : "Certifier Role Required (CFO / Owner)"}
          </span>
        </div>

        <form onSubmit={handleCamaCertify} className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="cama-period-select" className="block text-sm font-medium text-stone-800">
              Fiscal Period
            </label>
            <select
              id="cama-period-select"
              value={camaPeriodId}
              onChange={(e) => setCamaPeriodId(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cama-preparer-select" className="block text-sm font-medium text-stone-800">
              Prepared By (Segregation of Duties)
            </label>
            <select
              id="cama-preparer-select"
              value={preparedByUserId}
              onChange={(e) => setPreparedByUserId(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900"
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.fullName} ({ROLE_LABELS[m.role]})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cama-designation-select" className="block text-sm font-medium text-stone-800">
              Certifier Designation
            </label>
            <select
              id="cama-designation-select"
              value={certDesignation}
              onChange={(e) =>
                setCertDesignation(
                  e.target.value as "OWNER_MANAGING_DIRECTOR" | "CHARTERED_ACCOUNTANT_CFO",
                )
              }
              className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900"
            >
              <option value="CHARTERED_ACCOUNTANT_CFO">Chartered Accountant (CFO)</option>
              <option value="OWNER_MANAGING_DIRECTOR">Owner / Managing Director</option>
            </select>
          </div>

          <div>
            <label htmlFor="cama-frc-input" className="block text-sm font-medium text-stone-800">
              FRC Registration Number
            </label>
            <input
              id="cama-frc-input"
              type="text"
              value={frcRegNumber}
              onChange={(e) => setFrcRegNumber(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 text-sm text-stone-900"
              required
            />
          </div>

          <div>
            <label htmlFor="cama-body-input" className="block text-sm font-medium text-stone-800">
              ICAN / ANAN Number
            </label>
            <input
              id="cama-body-input"
              type="text"
              value={professionalBodyNo}
              onChange={(e) => setProfessionalBodyNo(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 text-sm text-stone-900"
              required
            />
          </div>

          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-xs text-stone-700">
              <input
                type="checkbox"
                checked={camaAccepted}
                onChange={(e) => setCamaAccepted(e.target.checked)}
                className="h-5 w-5 rounded border-stone-300 text-emerald-700"
              />
              I certify these statements give a true &amp; fair view under CAMA 2020 Sec 405.
            </label>
            <button
              type="submit"
              className="min-h-11 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
            >
              Certify &amp; Seal Fiscal Period
            </button>
          </div>
        </form>

        {latestCert ? (
          <div className="mt-4 rounded-xl bg-stone-50 p-3 text-xs text-stone-700">
            Latest Statutory Seal: <strong>{latestCert.periodLabel}</strong>{" "}
            by {latestCert.certifierFrcNumber} (Hash{" "}
            <code>{latestCert.financialStatementsHash.slice(0, 16)}...</code>)
          </div>
        ) : null}
      </section>

      <section
        aria-labelledby="rbac-members-heading"
        className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
      >
        <h2 id="rbac-members-heading" className="text-lg font-semibold text-stone-900">
          4. Team Directory &amp; Role-Based Access Control (RBAC)
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase text-stone-600">
                <th scope="col" className="py-2 pr-4">
                  Role
                </th>
                <th scope="col" className="py-2 pr-4">
                  Post Journals
                </th>
                <th scope="col" className="py-2 pr-4">
                  Reverse Entries
                </th>
                <th scope="col" className="py-2 pr-4">
                  Audit Log
                </th>
                <th scope="col" className="py-2 pr-4">
                  CAMA Sign-Off
                </th>
                <th scope="col" className="py-2">
                  Manage Team
                </th>
              </tr>
            </thead>
            <tbody>
              {ROLE_MATRIX_ROWS.map((row) => (
                <tr key={row.role} className="border-b border-stone-100 text-stone-800">
                  <td className="py-2 pr-4 font-medium">{ROLE_LABELS[row.role]}</td>
                  <td className="py-2 pr-4">{row.ledgerPost}</td>
                  <td className="py-2 pr-4">{row.ledgerReverse}</td>
                  <td className="py-2 pr-4">{row.auditRead}</td>
                  <td className="py-2 pr-4">{row.camaCertify}</td>
                  <td className="py-2">{row.manageTeam}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {canManageMembers ? (
          <form onSubmit={handleInviteMember} className="mt-5 grid gap-3 border-t border-stone-200 pt-4 sm:grid-cols-4">
            <div>
              <label htmlFor="invite-name" className="block text-xs font-medium text-stone-700">
                Staff Full Name
              </label>
              <input
                id="invite-name"
                type="text"
                value={inviteFullName}
                onChange={(e) => setInviteFullName(e.target.value)}
                placeholder="Chinedu Okafor"
                className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="invite-email" className="block text-xs font-medium text-stone-700">
                Work Email
              </label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="staff@lagostrading.ng"
                className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="invite-role" className="block text-xs font-medium text-stone-700">
                Assign Role
              </label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as ActorRole)}
                className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
              >
                <option value="BOOKKEEPER">Bookkeeper</option>
                <option value="BRANCH_OUTLET_CASHIER">Branch Cashier</option>
                <option value="CHARTERED_ACCOUNTANT_CFO">Chartered Accountant CFO</option>
                <option value="EXTERNAL_AUDITOR_READONLY">External Auditor (Read-Only)</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="min-h-11 w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Grant Role Access
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section
        aria-labelledby="audit-log-heading"
        className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="audit-log-heading" className="text-lg font-semibold text-stone-900">
              5. Immutable Hash-Chained Audit Trail
            </h2>
            <p className="text-xs text-stone-600">
              {canReadAudit
                ? "Append-only ledger and security event chain protecting financial integrity."
                : "Audit logs are restricted to Owner, Chartered Accountant CFO, and External Auditor roles."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {mode === "pro" ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
                {chainVerification.isValid ? "SHA-256 Chain Verified" : "Chain Broken"}
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleVerifyChain}
              className="min-h-11 rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-100"
            >
              Verify Hash Chain
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase text-stone-600">
                <th scope="col" className="py-2 pr-4">
                  Timestamp (UTC)
                </th>
                <th scope="col" className="py-2 pr-4">
                  Action
                </th>
                <th scope="col" className="py-2 pr-4">
                  Actor Role
                </th>
                <th scope="col" className="py-2 pr-4">
                  Entity
                </th>
                {mode === "pro" ? (
                  <th scope="col" className="py-2">
                    SHA-256 Event Hash
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {auditEvents.map((evt) => (
                <tr key={evt.id} className="border-b border-stone-100 text-stone-800">
                  <td className="py-2 pr-4 font-mono text-xs">{evt.occurredAt}</td>
                  <td className="py-2 pr-4 font-semibold">{evt.action}</td>
                  <td className="py-2 pr-4">{ROLE_LABELS[evt.actorRole]}</td>
                  <td className="py-2 pr-4">
                    {evt.entityType} ({evt.entityId.slice(0, 8)})
                  </td>
                  {mode === "pro" ? (
                    <td className="py-2 font-mono text-xs text-stone-600">
                      {evt.eventHash.slice(0, 20)}...
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
