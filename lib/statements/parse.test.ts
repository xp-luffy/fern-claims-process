import { describe, expect, test } from "bun:test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { parseStatementCsv, parseStatementPdf, parseStatementText } from "./parse";

describe("credit-card statement parsing", () => {
  test("extracts common card transaction layouts and ignores balances", () => {
    const rows = parseStatementText(
      [
        "Statement period 01/08/2026 to 31/08/2026",
        "03/08 MICROSOFT 365 S$ 320.00",
        "06/08 ADOBE CREATIVE CLOUD 89.99",
        "10 Aug GOOGLE ADS USD 1,250.00",
        "Previous balance 4,020.00",
        "Payment received (4,020.00)",
      ].join("\n"),
      { dateFormat: "dmy", defaultCurrency: "SGD", statementYear: 2026 },
    );

    expect(rows).toEqual([
      { merchant: "MICROSOFT 365", amount: 320, currency: "SGD", transaction_date: "2026-08-03" },
      { merchant: "ADOBE CREATIVE CLOUD", amount: 89.99, currency: "SGD", transaction_date: "2026-08-06" },
      { merchant: "GOOGLE ADS", amount: 1250, currency: "USD", transaction_date: "2026-08-10" },
    ]);
  });

  test("uses the final billed amount when a row includes two dates and currencies", () => {
    const rows = parseStatementText("08/12/2026 08/14/2026 META ADS 780.00 USD 800.00", {
      dateFormat: "mdy",
      defaultCurrency: "USD",
    });
    expect(rows[0]).toEqual({ merchant: "META ADS 780.00", amount: 800, currency: "USD", transaction_date: "2026-08-12" });
  });

  test("keeps CSV import as a fallback", () => {
    expect(parseStatementCsv("merchant,amount,date,currency\nAmazon,79.25,2026-08-22,USD")).toEqual([
      { merchant: "Amazon", amount: 79.25, currency: "USD", transaction_date: "2026-08-22" },
    ]);
  });

  test("extracts transactions from a real text-based PDF", async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([612, 792]);
    const font = await document.embedFont(StandardFonts.Helvetica);
    page.drawText("Credit card statement 2026", { x: 50, y: 730, size: 12, font });
    page.drawText("08/03 MICROSOFT 365 $320.00", { x: 50, y: 700, size: 12, font });
    page.drawText("08/06 ADOBE CREATIVE CLOUD $89.99", { x: 50, y: 680, size: 12, font });
    const result = await parseStatementPdf(await document.save(), {
      dateFormat: "mdy",
      defaultCurrency: "USD",
      statementYear: 2026,
    });

    expect(result.pageCount).toBe(1);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].merchant).toBe("MICROSOFT 365");
    expect(result.rows[1].amount).toBe(89.99);
  });
});
