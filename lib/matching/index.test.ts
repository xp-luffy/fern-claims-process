import { describe, expect, test } from "bun:test";
import { bestMatch, categoriseVendor, matchScore } from "./index";
import type { Invoice, StatementItem } from "@/lib/types";

const invoice: Invoice = {
  id: "invoice-1",
  company_id: "company-1",
  vendor: "Microsoft 365",
  amount: 320,
  currency: "USD",
  invoice_date: "2026-08-10",
  category: "software",
  source: "manual",
  file_path: null,
  statement_item_id: null,
  match_status: "unmatched",
  claim_id: "claim-1",
  created_at: "2026-08-10T00:00:00Z",
  user_id: null,
};

function statement(overrides: Partial<StatementItem> = {}): StatementItem {
  return {
    id: "statement-1",
    company_id: "company-1",
    merchant: "MICROSOFT*365",
    amount: 320,
    currency: "USD",
    transaction_date: "2026-08-12",
    matched_invoice_id: null,
    matched: false,
    created_at: "2026-08-12T00:00:00Z",
    user_id: null,
    ...overrides,
  };
}

describe("deterministic invoice matching", () => {
  test("scores amount, date, and vendor overlap at 100", () => {
    expect(matchScore(invoice, statement())).toBe(100);
  });

  test("scores same amount and nearby date at 80", () => {
    expect(matchScore(invoice, statement({ merchant: "Unrelated merchant" }))).toBe(80);
  });

  test("scores amount-only candidates at 50", () => {
    expect(matchScore(invoice, statement({ transaction_date: "2026-09-20" }))).toBe(50);
  });

  test("rejects amount or currency mismatches", () => {
    expect(matchScore(invoice, statement({ amount: 319.99 }))).toBe(0);
    expect(matchScore(invoice, statement({ currency: "SGD" }))).toBe(0);
  });

  test("selects the strongest available unmatched item", () => {
    const result = bestMatch(invoice, [
      statement({ id: "used", matched: true }),
      statement({ id: "amount-only", transaction_date: "2026-09-20" }),
      statement({ id: "exact" }),
    ]);

    expect(result?.item.id).toBe("exact");
    expect(result?.score).toBe(100);
  });
});

describe("vendor categorisation", () => {
  test("maps known vendors and falls back safely", () => {
    expect(categoriseVendor("Adobe Creative Cloud")).toBe("software");
    expect(categoriseVendor("Meta Ads")).toBe("ads");
    expect(categoriseVendor("Staples")).toBe("office");
    expect(categoriseVendor("Airport Taxi")).toBe("other");
  });
});
