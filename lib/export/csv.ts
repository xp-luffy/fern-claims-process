import type { ClaimWorkspace, InvoiceCategory } from "@/lib/types";

function cell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function claimCsv(workspace: ClaimWorkspace) {
  const lines: string[][] = [
    ["Fern Claims Process"],
    ["Company", workspace.claim.company.name],
    ["Period", workspace.claim.period_month],
    ["Status", workspace.claim.status],
    [],
    ["Invoices"],
    ["Vendor", "Date", "Category", "Currency", "Amount", "Source", "Match status"],
    ...workspace.invoices.map((invoice) => [
      invoice.vendor,
      invoice.invoice_date,
      invoice.category,
      invoice.currency,
      Number(invoice.amount).toFixed(2),
      invoice.source,
      invoice.match_status,
    ]),
    [],
    ["Category totals"],
    ["Category", "Amount"],
    ...(["software", "ads", "office", "other"] as InvoiceCategory[]).map((category) => [
      category,
      Number(workspace.summary?.category_totals?.[category] ?? 0).toFixed(2),
    ]),
    ["Total", Number(workspace.summary?.total_amount ?? 0).toFixed(2)],
    [],
    ["Unmatched statement charges"],
    ["Merchant", "Date", "Currency", "Amount"],
    ...workspace.statementItems.filter((item) => !item.matched).map((item) => [
      item.merchant,
      item.transaction_date,
      item.currency,
      Number(item.amount).toFixed(2),
    ]),
  ];
  return lines.map((line) => line.map(cell).join(",")).join("\r\n");
}
