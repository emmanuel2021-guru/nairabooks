import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getAccounts } from "@/app/api/ledger/accounts/route";
import { GET as getVouchers, POST as postVoucher } from "@/app/api/ledger/vouchers/route";
import { POST as reverseVoucher } from "@/app/api/ledger/vouchers/reverse/route";

describe("Next.js Server BFF /api/ledger routes", () => {
  it("lists seeded chart of accounts and rejects float literals in voucher payloads", async () => {
    const acctRes = await getAccounts(
      new NextRequest("http://localhost:3000/api/ledger/accounts"),
    );
    expect(acctRes.status).toBe(200);
    const acctJson = (await acctRes.json()) as { items: Array<{ code: string }> };
    expect(acctJson.items.some((a) => a.code === "1010")).toBe(true);

    const floatReq = new NextRequest("http://localhost:3000/api/ledger/vouchers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        postingDate: "2026-04-10",
        reference: "FLOAT-TRAP",
        sourceModule: "GENERAL_LEDGER",
        lines: [
          {
            accountId: "11111111-1111-4111-8111-111111110101",
            debitAmount: 100.5,
            creditAmount: "0.00",
            currency: "NGN",
            exchangeRateToNgn: "1.000000",
          },
          {
            accountId: "11111111-1111-4111-8111-111111110401",
            debitAmount: "0.00",
            creditAmount: "100.50",
            currency: "NGN",
            exchangeRateToNgn: "1.000000",
          },
        ],
      }),
    });
    const floatRes = await postVoucher(floatReq);
    expect(floatRes.status).toBe(400);
    const floatBody = (await floatRes.json()) as { __typename: string; code: string };
    expect(floatBody.__typename).toBe("ValidationError");
    expect(floatBody.code).toBe("VALIDATION_ERROR");
  });

  it("posts a balanced voucher and creates an immutable reversal via BFF", async () => {
    const postReq = new NextRequest("http://localhost:3000/api/ledger/vouchers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        postingDate: "2026-04-11",
        reference: "BFF-SALE-001",
        sourceModule: "GENERAL_LEDGER",
        lines: [
          {
            accountId: "11111111-1111-4111-8111-111111110101",
            debitAmount: "45000.00",
            creditAmount: "0.00",
            currency: "NGN",
            exchangeRateToNgn: "1.000000",
            memo: "Cash received",
          },
          {
            accountId: "11111111-1111-4111-8111-111111110401",
            debitAmount: "0.00",
            creditAmount: "45000.00",
            currency: "NGN",
            exchangeRateToNgn: "1.000000",
            memo: "Sales credit",
          },
        ],
      }),
    });
    const postRes = await postVoucher(postReq);
    expect(postRes.status).toBe(201);
    const created = (await postRes.json()) as { __typename: string; id: string; totalDebitNgn: string };
    expect(created.__typename).toBe("JournalVoucher");
    expect(created.totalDebitNgn).toBe("45000.00");

    const listRes = await getVouchers(new NextRequest("http://localhost:3000/api/ledger/vouchers"));
    expect(listRes.status).toBe(200);

    const revReq = new NextRequest("http://localhost:3000/api/ledger/vouchers/reverse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        originalVoucherId: created.id,
        reversalDate: "2026-04-12",
        reason: "Correction test",
      }),
    });
    const revRes = await reverseVoucher(revReq);
    expect(revRes.status).toBe(200);
    const reversal = (await revRes.json()) as { __typename: string; reference: string };
    expect(reversal.__typename).toBe("JournalVoucher");
    expect(reversal.reference).toContain("REV-");
  });
});
