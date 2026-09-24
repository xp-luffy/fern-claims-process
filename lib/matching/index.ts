import type { Invoice, InvoiceCategory, StatementItem } from "@/lib/types";

function normaliseVendor(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function categoriseVendor(vendor: string): InvoiceCategory {
  const value = vendor.toLowerCase();
  if (["google", "meta", "facebook", "linkedin"].some((term) => value.includes(term))) return "ads";
  if (["microsoft", "adobe", "slack", "notion"].some((term) => value.includes(term))) return "software";
  if (["amazon", "staples", "office"].some((term) => value.includes(term))) return "office";
  return "other";
}

export function matchScore(invoice: Invoice, item: StatementItem) {
  if (Number(invoice.amount) !== Number(item.amount) || invoice.currency !== item.currency) return 0;

  const days = Math.abs(
    (new Date(`${invoice.invoice_date}T00:00:00Z`).getTime() -
      new Date(`${item.transaction_date}T00:00:00Z`).getTime()) /
      86_400_000,
  );
  const vendor = normaliseVendor(invoice.vendor);
  const merchant = normaliseVendor(item.merchant);
  const vendorOverlap = vendor.length > 2 && (vendor.includes(merchant) || merchant.includes(vendor));

  if (days <= 7 && vendorOverlap) return 100;
  if (days <= 7) return 80;
  return 50;
}

export function bestMatch(invoice: Invoice, items: StatementItem[]) {
  return items
    .filter((item) => !item.matched)
    .map((item) => ({ item, score: matchScore(invoice, item) }))
    .sort((a, b) => b.score - a.score)[0] ?? null;
}
