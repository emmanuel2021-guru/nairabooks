import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import React from "react";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { GET, POST } from "@/app/api/transactions/route";
import { TransactionRecordEditorWorkspace } from "@/components/transactions/TransactionRecordEditorWorkspace";

describe("Slice 7: End-to-End Operational Transaction Posting & BFF Integration", () => {
  it("GET /api/transactions returns journal vouchers connection", async () => {
    const req = new NextRequest("http://localhost:3000/api/transactions?first=10");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { edges: unknown[]; pageInfo: unknown };
    expect(Array.isArray(body.edges)).toBe(true);
    expect(body.pageInfo).toBeDefined();
  });

  it("POST /api/transactions posts a Sales Invoice into the general ledger with 7.5% VAT", async () => {
    const req = new NextRequest("http://localhost:3000/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        typeId: "sales-invoicing",
        reference: "INV-BFF-2026-001",
        counterparty: "Zenith Bank Headquarters",
        date: "2026-10-15",
        vatEnabled: true,
        whtRatePct: 5,
        paymentMethod: "Bank Transfer",
        lineItems: [
          {
            description: "Enterprise Accounting Software License",
            accountCode: "4010",
            quantity: 1,
            unitPriceNgn: 400000,
            vatApplicable: true,
          },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      ok: boolean;
      voucherId: string;
      voucherNumber: string;
      totalDebitNgn: string;
      totalCreditNgn: string;
      reference: string;
    };

    expect(body.ok).toBe(true);
    expect(body.voucherNumber).toMatch(/^JV-2026-/);
    expect(body.reference).toBe("INV-BFF-2026-001");
    // 400k + 7.5% VAT (30k) = 430,000.00
    expect(body.totalDebitNgn).toBe("430000.00");
    expect(body.totalCreditNgn).toBe("430000.00");
  });

  it("POST /api/transactions posts a Customer Receipt into the general ledger", async () => {
    const req = new NextRequest("http://localhost:3000/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        typeId: "receive-money",
        reference: "REC-BFF-2026-005",
        counterparty: "Zenith Bank Headquarters",
        date: "2026-10-25",
        amountNgn: 410000,
        paymentMethod: "Bank Transfer",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      ok: boolean;
      totalDebitNgn: string;
      totalCreditNgn: string;
    };
    expect(body.ok).toBe(true);
    expect(body.totalDebitNgn).toBe("410000.00");
    expect(body.totalCreditNgn).toBe("410000.00");
  });

  it("renders TransactionRecordEditorWorkspace cleanly with zero axe-core violations", async () => {
    const { container } = render(
      <TransactionRecordEditorWorkspace mode="create" typeId="sales-invoicing" />,
    );

    expect(
      screen.getByRole("button", { name: /Post Sales Invoice/i }),
    ).toBeInTheDocument();

    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });
});
