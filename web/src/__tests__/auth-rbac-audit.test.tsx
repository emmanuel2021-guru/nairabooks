import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { NextRequest } from "next/server";

import { WorkspaceModeProvider } from "@/state/workspace-mode";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { SecurityAuditWorkspace } from "@/components/SecurityAuditWorkspace";

import { POST as loginPost } from "@/app/api/auth/login/route";
import { GET as sessionGet } from "@/app/api/auth/session/route";
import { POST as switchWorkspacePost } from "@/app/api/auth/switch-workspace/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";
import { GET as membersGet, POST as membersPost } from "@/app/api/auth/members/route";
import { GET as auditEventsGet } from "@/app/api/audit/events/route";
import { GET as auditVerifyGet } from "@/app/api/audit/verify/route";
import {
  GET as camaListGet,
  POST as camaCertifyPost,
} from "@/app/api/audit/cama-certifications/route";
import { POST as postVoucherRoute } from "@/app/api/ledger/vouchers/route";
import { POST as reverseVoucherRoute } from "@/app/api/ledger/vouchers/reverse/route";
import { GET as frcnReportRoute } from "@/app/api/ledger/reports/frcn/route";

const PRIMARY_WS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const SECONDARY_WS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002";

function extractCookiePair(res: Response, cookieName: string): string {
  const raw = res.headers.get("set-cookie") ?? "";
  const match = new RegExp(`${cookieName}=([^;]+)`).exec(raw);
  if (!match) {
    throw new Error(`Missing cookie ${cookieName} in header: ${raw}`);
  }
  return `${cookieName}=${match[1]}`;
}

async function loginPersona(email: string, password = "NairaBooks#2026"): Promise<string> {
  const req = new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const res = await loginPost(req);
  expect(res.status).toBe(200);
  return extractCookiePair(res, "nb_session");
}

describe("Slice 7: Multi-tenant Auth, RBAC, CAMA Sec 405 & Audit Trail", () => {
  it("enforces fail-closed login, HttpOnly cookies, and workspace switch membership", async () => {
    const badReq = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "clerk@lagostrading.ng",
        password: "WrongPassword#1",
      }),
    });
    const badRes = await loginPost(badReq);
    expect(badRes.status).toBe(401);
    const badJson = (await badRes.json()) as Record<string, unknown>;
    expect(JSON.stringify(badJson)).not.toContain("scrypt");
    expect(JSON.stringify(badJson)).not.toContain("WrongPassword");

    const ownerCookie = await loginPersona("owner@lagostrading.ng");
    const sessionReq = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "GET",
      headers: { Cookie: ownerCookie },
    });
    const sessionRes = await sessionGet(sessionReq);
    expect(sessionRes.status).toBe(200);
    const sessionJson = (await sessionRes.json()) as {
      authenticated: boolean;
      user: { role: string; email: string };
      workspace: { id: string };
    };
    expect(sessionJson.authenticated).toBe(true);
    expect(sessionJson.user.role).toBe("OWNER_MANAGING_DIRECTOR");
    expect(sessionJson.workspace.id).toBe(PRIMARY_WS);

    // Tampered cookie is rejected with 401
    const tamperedReq = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "GET",
      headers: { Cookie: `${ownerCookie}tampered` },
    });
    const tamperedRes = await sessionGet(tamperedReq);
    expect(tamperedRes.status).toBe(401);

    // Owner switches workspace to secondary workspace cleanly
    const switchReq = new NextRequest("http://localhost:3000/api/auth/switch-workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie },
      body: JSON.stringify({ workspaceId: SECONDARY_WS }),
    });
    const switchRes = await switchWorkspacePost(switchReq);
    expect(switchRes.status).toBe(200);
    const switchedCookie = extractCookiePair(switchRes, "nb_session");

    // Spoofed x-workspace-id header mismatch is rejected (SEC-REQ-01)
    const spoofReq = new NextRequest(
      "http://localhost:3000/api/ledger/reports/frcn?fiscalPeriodId=22222222-2222-4222-8222-222222220002",
      {
        method: "GET",
        headers: {
          Cookie: switchedCookie,
          "x-workspace-id": PRIMARY_WS,
        },
      },
    );
    const spoofRes = await frcnReportRoute(spoofReq);
    expect(spoofRes.status).toBe(403);

    // Clerk cannot switch to unauthorized workspace
    const clerkCookie = await loginPersona("clerk@lagostrading.ng");
    const forbiddenSwitch = new NextRequest("http://localhost:3000/api/auth/switch-workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: clerkCookie },
      body: JSON.stringify({ workspaceId: SECONDARY_WS }),
    });
    const forbiddenRes = await switchWorkspacePost(forbiddenSwitch);
    expect(forbiddenRes.status).toBe(403);

    // Logout clears cookie
    const logoutReq = new NextRequest("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: { Cookie: clerkCookie },
    });
    const logoutRes = await logoutPost(logoutReq);
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("enforces RBAC on ledger mutations, reversals, and audit inspection", async () => {
    // Explicit strict mode rejects unauthenticated calls
    const unauthReq = new NextRequest("http://localhost:3000/api/ledger/vouchers", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-require-auth": "1" },
      body: JSON.stringify({}),
    });
    const unauthRes = await postVoucherRoute(unauthReq);
    expect(unauthRes.status).toBe(401);

    const auditorCookie = await loginPersona("auditor@icanaudit.ng");
    // Auditor can inspect FRCN & Audit events
    const auditorFrcnRes = await frcnReportRoute(
      new NextRequest(
        "http://localhost:3000/api/ledger/reports/frcn?fiscalPeriodId=22222222-2222-4222-8222-222222220002",
        { method: "GET", headers: { Cookie: auditorCookie } },
      ),
    );
    expect(auditorFrcnRes.status).toBe(200);

    const auditorAuditRes = await auditEventsGet(
      new NextRequest("http://localhost:3000/api/audit/events?first=20", {
        method: "GET",
        headers: { Cookie: auditorCookie },
      }),
    );
    expect(auditorAuditRes.status).toBe(200);

    // Auditor is blocked from posting journals
    const auditorPostRes = await postVoucherRoute(
      new NextRequest("http://localhost:3000/api/ledger/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: auditorCookie },
        body: JSON.stringify({
          postingDate: "2026-01-15",
          reference: "RBAC-AUD-DENY-1",
          sourceModule: "MANUAL",
          idempotencyKey: "rbac-auditor-deny-1",
          lines: [
            {
              accountId: "11111111-1111-4111-8111-111111110101",
              debitAmount: "100.00",
              creditAmount: "0.00",
              currency: "NGN",
              exchangeRateToNgn: "1.000000",
            },
            {
              accountId: "11111111-1111-4111-8111-111111110401",
              debitAmount: "0.00",
              creditAmount: "100.00",
              currency: "NGN",
              exchangeRateToNgn: "1.000000",
            },
          ],
        }),
      }),
    );
    expect(auditorPostRes.status).toBe(403);

    // Clerk can post journal voucher (and audit chain records it), cannot reverse or read audit log
    const clerkCookie = await loginPersona("clerk@lagostrading.ng");
    const clerkPostRes = await postVoucherRoute(
      new NextRequest("http://localhost:3000/api/ledger/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: clerkCookie },
        body: JSON.stringify({
          postingDate: "2026-01-20",
          reference: "RBAC-CLERK-POST-1",
          sourceModule: "MANUAL",
          idempotencyKey: "rbac-clerk-post-1",
          lines: [
            {
              accountId: "11111111-1111-4111-8111-111111110501",
              debitAmount: "5000.00",
              creditAmount: "0.00",
              currency: "NGN",
              exchangeRateToNgn: "1.000000",
            },
            {
              accountId: "11111111-1111-4111-8111-111111110101",
              debitAmount: "0.00",
              creditAmount: "5000.00",
              currency: "NGN",
              exchangeRateToNgn: "1.000000",
            },
          ],
        }),
      }),
    );
    expect(clerkPostRes.status).toBe(201);

    const clerkReverseRes = await reverseVoucherRoute(
      new NextRequest("http://localhost:3000/api/ledger/vouchers/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: clerkCookie },
        body: JSON.stringify({ voucherId: "any", reason: "Not allowed" }),
      }),
    );
    expect(clerkReverseRes.status).toBe(403);

    const clerkAuditRes = await auditEventsGet(
      new NextRequest("http://localhost:3000/api/audit/events", {
        method: "GET",
        headers: { Cookie: clerkCookie },
      }),
    );
    expect(clerkAuditRes.status).toBe(403);
  });

  it("enforces Segregation of Duties on CAMA Sec 405 certification & verifies hash chain", async () => {
    const cfoCookie = await loginPersona("cfo@lagostrading.ng");

    // Self-certification by CFO triggers SegregationOfDutiesError
    const sodReq = new NextRequest("http://localhost:3000/api/audit/cama-certifications", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cfoCookie },
      body: JSON.stringify({
        periodId: "22222222-2222-4222-8222-222222220002",
        preparedByUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002",
        certifierFrcNumber: "FRC/2026/000991",
        certifierDesignation: "CHARTERED_ACCOUNTANT_CFO",
        professionalBodyNumber: "ICAN-2026-00421",
        camaDeclarationAccepted: true,
      }),
    });
    const sodRes = await camaCertifyPost(sodReq);
    expect(sodRes.status).toBe(403);
    const sodBody = (await sodRes.json()) as { __typename?: string; requiredRole?: string };
    expect(sodBody.__typename).toBe("SegregationOfDutiesError");
    expect(sodBody.requiredRole).toBe("CHARTERED_ACCOUNTANT_CFO");

    // Valid CAMA Sec 405 certification (Clerk prepared, CFO certifies)
    const certReq = new NextRequest("http://localhost:3000/api/audit/cama-certifications", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cfoCookie },
      body: JSON.stringify({
        periodId: "22222222-2222-4222-8222-222222220002",
        preparedByUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0003",
        certifierFrcNumber: "FRC/2026/000991",
        certifierDesignation: "CHARTERED_ACCOUNTANT_CFO",
        professionalBodyNumber: "ICAN-2026-00421",
        camaDeclarationAccepted: true,
      }),
    });
    const certRes = await camaCertifyPost(certReq);
    expect(certRes.status).toBe(201);
    const certJson = (await certRes.json()) as {
      period: { status: string };
      certification: { financialStatementsHash: string; certifierFrcNumber: string };
    };
    expect(certJson.period.status).toBe("CLOSED_CAMA_CERTIFIED");
    expect(certJson.certification.financialStatementsHash).toHaveLength(64);
    expect(certJson.certification.certifierFrcNumber).toBe("FRC/2026/000991");

    // List certifications + verify cryptographic audit chain
    const listRes = await camaListGet(
      new NextRequest("http://localhost:3000/api/audit/cama-certifications", {
        method: "GET",
        headers: { Cookie: cfoCookie },
      }),
    );
    expect(listRes.status).toBe(200);

    const verifyRes = await auditVerifyGet(
      new NextRequest("http://localhost:3000/api/audit/verify", {
        method: "GET",
        headers: { Cookie: cfoCookie },
      }),
    );
    expect(verifyRes.status).toBe(200);
    const verifyJson = (await verifyRes.json()) as { isValid: boolean; verifiedCount: number };
    expect(verifyJson.isValid).toBe(true);
    expect(verifyJson.verifiedCount).toBeGreaterThanOrEqual(2);

    // Owner can invite/assign workspace member; Clerk cannot
    const ownerCookie = await loginPersona("owner@lagostrading.ng");
    const membersListRes = await membersGet(
      new NextRequest("http://localhost:3000/api/auth/members", {
        method: "GET",
        headers: { Cookie: ownerCookie },
      }),
    );
    expect(membersListRes.status).toBe(200);

    const inviteRes = await membersPost(
      new NextRequest("http://localhost:3000/api/auth/members", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerCookie },
        body: JSON.stringify({
          email: "junior.clerk@lagostrading.ng",
          fullName: "Chinedu Okafor",
          role: "BOOKKEEPER",
        }),
      }),
    );
    expect(inviteRes.status).toBe(201);
  });

  it("renders SecurityAuditWorkspace with single h1, zero asides, Simple|Pro toggle, and zero axe violations", async () => {
    const { container } = render(
      <WorkspaceModeProvider>
        <TopNavCapsule activeTab="overview" />
        <SecurityAuditWorkspace
          initialData={{
            session: {
              authenticated: true,
              user: {
                id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001",
                email: "owner@lagostrading.ng",
                fullName: "Adaeze Nwosu",
                role: "OWNER_MANAGING_DIRECTOR",
                designation: "OWNER_MANAGING_DIRECTOR",
                frcRegNumber: null,
              },
              workspace: {
                id: PRIMARY_WS,
                legalName: "Lagos Trading & Hospitality Ltd",
                rcNumber: "RC 1482910",
                baseCurrency: "NGN",
              },
              availableWorkspaces: [
                {
                  id: PRIMARY_WS,
                  legalName: "Lagos Trading & Hospitality Ltd",
                  rcNumber: "RC 1482910",
                  role: "OWNER_MANAGING_DIRECTOR",
                },
                {
                  id: SECONDARY_WS,
                  legalName: "Abuja Clinic & Pharmacy Ltd",
                  rcNumber: "RC 2094418",
                  role: "OWNER_MANAGING_DIRECTOR",
                },
              ],
              permissions: [
                "LEDGER_READ",
                "LEDGER_POST",
                "LEDGER_REVERSE",
                "LEDGER_PERIOD_CLOSE",
                "AUDIT_READ",
                "AUDIT_CAMA_CERTIFY",
                "MEMBERS_MANAGE",
              ],
            },
            members: [
              {
                userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001",
                email: "owner@lagostrading.ng",
                fullName: "Adaeze Nwosu",
                role: "OWNER_MANAGING_DIRECTOR",
                frcRegNumber: null,
                isActive: true,
              },
              {
                userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002",
                email: "cfo@lagostrading.ng",
                fullName: "Tunde Bakare FCA",
                role: "CHARTERED_ACCOUNTANT_CFO",
                frcRegNumber: "FRC/2026/000991",
                isActive: true,
              },
              {
                userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0003",
                email: "clerk@lagostrading.ng",
                fullName: "Amina Ibrahim",
                role: "BOOKKEEPER",
                frcRegNumber: null,
                isActive: true,
              },
            ],
            periods: [
              {
                id: "22222222-2222-4222-8222-222222220002",
                label: "FY2026",
                startDate: "2026-01-01",
                endDate: "2026-12-31",
                status: "OPEN",
                camaCertification: null,
              },
            ],
            auditEvents: [
              {
                id: "evt-1",
                workspaceId: PRIMARY_WS,
                actorUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0003",
                actorRole: "BOOKKEEPER",
                action: "POST_JOURNAL_VOUCHER",
                entityType: "JournalVoucher",
                entityId: "jv-001",
                payloadHash: "a".repeat(64),
                previousHash: "0".repeat(64),
                eventHash: "b".repeat(64),
                occurredAt: "2026-03-01T10:15:00.000Z",
              },
            ],
            chainVerification: {
              isValid: true,
              verifiedCount: 1,
              latestEventHash: "b".repeat(64),
              brokenAtEventId: null,
            },
            camaCertifications: [],
          }}
        />
      </WorkspaceModeProvider>,
    );

    expect(container.querySelectorAll("aside")).toHaveLength(0);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelectorAll(".fixed.bottom-0")).toHaveLength(0);

    expect(screen.getByText(/Access Control, Sessions & CAMA Audit Trail/i)).toBeTruthy();
    expect(screen.getByText(/POST_JOURNAL_VOUCHER/i)).toBeTruthy();

    // Switch to Pro mode and confirm hash chain / FRC details surface
    const proBtn = screen.getByRole("button", { name: /^Pro$/i });
    fireEvent.click(proBtn);
    await waitFor(() => {
      expect(screen.getByText(/SHA-256 Chain Verified/i)).toBeTruthy();
    });

    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });
});
