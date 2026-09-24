import { createClient } from "@/lib/supabase/server";
import { monthBounds } from "@/lib/utils";
import type { Claim, ClaimWithCompany, ClaimWorkspace, ExpenditureSummary, Invoice, StatementItem } from "@/lib/types";

export async function listClaims(): Promise<ClaimWithCompany[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("claims")
    .select("*, company:companies(*)")
    .order("period_month", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load claims: ${error.message}`);
  return (data ?? []) as unknown as ClaimWithCompany[];
}

export async function getClaim(id: string): Promise<ClaimWithCompany | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("claims").select("*, company:companies(*)").eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load claim: ${error.message}`);
  return data as unknown as ClaimWithCompany | null;
}

export async function getClaimWorkspace(id: string): Promise<ClaimWorkspace | null> {
  const claim = await getClaim(id);
  if (!claim) return null;

  const supabase = await createClient();
  const { start, end } = monthBounds(claim.period_month);
  const [invoiceResult, statementResult, summaryResult, unassignedResult] = await Promise.all([
    supabase.from("invoices").select("*").eq("claim_id", id).order("invoice_date"),
    supabase
      .from("statement_items")
      .select("*")
      .eq("company_id", claim.company_id)
      .gte("transaction_date", start)
      .lt("transaction_date", end)
      .order("transaction_date"),
    supabase.from("expenditure_summaries").select("*").eq("claim_id", id).maybeSingle(),
    supabase
      .from("invoices")
      .select("*")
      .eq("company_id", claim.company_id)
      .is("claim_id", null)
      .order("invoice_date", { ascending: false }),
  ]);

  for (const [label, result] of [
    ["invoices", invoiceResult],
    ["statement items", statementResult],
    ["summary", summaryResult],
    ["unassigned invoices", unassignedResult],
  ] as const) {
    if (result.error) throw new Error(`Could not load ${label}: ${result.error.message}`);
  }

  return {
    claim,
    invoices: (invoiceResult.data ?? []) as Invoice[],
    statementItems: (statementResult.data ?? []) as StatementItem[],
    summary: (summaryResult.data as ExpenditureSummary | null) ?? null,
    unassignedInvoices: (unassignedResult.data ?? []) as Invoice[],
  };
}

export async function getClaimRecord(id: string): Promise<Claim | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("claims").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load claim: ${error.message}`);
  return data as Claim | null;
}
