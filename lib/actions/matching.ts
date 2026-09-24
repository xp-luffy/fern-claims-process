"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { bestMatch, matchScore } from "@/lib/matching";
import type { Invoice, StatementItem } from "@/lib/types";
import { errorMessage, logAudit, safeReturnPath, textValue, withMessage } from "@/lib/actions/shared";

async function confirmMatch(invoice: Invoice, item: StatementItem) {
  if (invoice.company_id !== item.company_id) throw new Error("Invoice and statement item belong to different companies");
  if (invoice.statement_item_id && invoice.statement_item_id !== item.id) throw new Error("Invoice is already matched");
  if (item.matched_invoice_id && item.matched_invoice_id !== invoice.id) throw new Error("Statement item is already matched");

  const supabase = await createClient();
  const { error: invoiceError } = await supabase
    .from("invoices")
    .update({ statement_item_id: item.id, match_status: "matched" })
    .eq("id", invoice.id);
  if (invoiceError) throw invoiceError;

  const { error: statementError } = await supabase
    .from("statement_items")
    .update({ matched_invoice_id: invoice.id, matched: true })
    .eq("id", item.id);
  if (statementError) {
    await supabase.from("invoices").update({ statement_item_id: null, match_status: "unmatched" }).eq("id", invoice.id);
    throw statementError;
  }

  await logAudit({
    action: "invoice.matched",
    entityType: "invoice",
    entityId: invoice.id,
    before: { statement_item_id: invoice.statement_item_id, match_status: invoice.match_status },
    after: { statement_item_id: item.id, match_status: "matched", score: matchScore(invoice, item) },
    riskLevel: "medium",
  });
}

export async function matchInvoiceAction(formData: FormData) {
  const returnTo = safeReturnPath(formData, "/claims");
  let destination: string;
  try {
    const invoiceId = textValue(formData, "invoice_id");
    const statementItemId = textValue(formData, "statement_item_id");
    const claimId = textValue(formData, "claim_id", false);
    const supabase = await createClient();
    const [{ data: invoice, error: invoiceError }, { data: item, error: itemError }] = await Promise.all([
      supabase.from("invoices").select("*").eq("id", invoiceId).single(),
      supabase.from("statement_items").select("*").eq("id", statementItemId).single(),
    ]);
    if (invoiceError || !invoice) throw invoiceError ?? new Error("Invoice not found");
    if (itemError || !item) throw itemError ?? new Error("Statement item not found");
    await confirmMatch(invoice as Invoice, item as StatementItem);
    revalidatePath("/");
    revalidatePath("/invoices");
    revalidatePath("/statements");
    if (claimId) revalidatePath(`/claims/${claimId}`);
    destination = withMessage(returnTo, "notice", `Matched ${invoice.vendor} to ${item.merchant}.`);
  } catch (error) {
    destination = withMessage(returnTo, "error", errorMessage(error));
  }
  redirect(destination);
}

export async function autoMatchClaimAction(formData: FormData) {
  const returnTo = safeReturnPath(formData, "/claims");
  let destination: string;
  try {
    const claimId = textValue(formData, "claim_id");
    const supabase = await createClient();
    const { data: claim, error: claimError } = await supabase.from("claims").select("*").eq("id", claimId).single();
    if (claimError || !claim) throw claimError ?? new Error("Claim not found");
    const [invoiceResult, itemResult] = await Promise.all([
      supabase.from("invoices").select("*").eq("claim_id", claimId).neq("match_status", "matched"),
      supabase.from("statement_items").select("*").eq("company_id", claim.company_id).eq("matched", false),
    ]);
    if (invoiceResult.error) throw invoiceResult.error;
    if (itemResult.error) throw itemResult.error;
    const available = [...((itemResult.data ?? []) as StatementItem[])];
    let matched = 0;
    for (const invoice of (invoiceResult.data ?? []) as Invoice[]) {
      const suggestion = bestMatch(invoice, available);
      if (suggestion && suggestion.score >= 80) {
        await confirmMatch(invoice, suggestion.item);
        available.splice(available.findIndex((item) => item.id === suggestion.item.id), 1);
        matched += 1;
      }
    }
    revalidatePath("/");
    revalidatePath("/invoices");
    revalidatePath("/statements");
    revalidatePath(`/claims/${claimId}`);
    destination = withMessage(returnTo, "notice", matched ? `${matched} high-confidence match${matched === 1 ? "" : "es"} confirmed.` : "No unmatched pairs scored 80 or higher.");
  } catch (error) {
    destination = withMessage(returnTo, "error", errorMessage(error));
  }
  redirect(destination);
}

export async function unmatchInvoiceAction(formData: FormData) {
  const returnTo = safeReturnPath(formData, "/claims");
  let destination: string;
  try {
    const invoiceId = textValue(formData, "invoice_id");
    const claimId = textValue(formData, "claim_id", false);
    const supabase = await createClient();
    const { data: invoice, error: loadError } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
    if (loadError || !invoice) throw loadError ?? new Error("Invoice not found");
    if (invoice.statement_item_id) {
      const { error } = await supabase
        .from("statement_items")
        .update({ matched_invoice_id: null, matched: false })
        .eq("id", invoice.statement_item_id);
      if (error) throw error;
    }
    const { error } = await supabase
      .from("invoices")
      .update({ statement_item_id: null, match_status: "unmatched" })
      .eq("id", invoiceId);
    if (error) throw error;
    await logAudit({ action: "invoice.unmatched", entityType: "invoice", entityId: invoiceId, before: invoice, riskLevel: "medium" });
    revalidatePath("/invoices");
    revalidatePath("/statements");
    if (claimId) revalidatePath(`/claims/${claimId}`);
    destination = withMessage(returnTo, "notice", "Match removed.");
  } catch (error) {
    destination = withMessage(returnTo, "error", errorMessage(error));
  }
  redirect(destination);
}
