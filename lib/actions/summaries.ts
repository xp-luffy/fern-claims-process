"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { monthBounds } from "@/lib/utils";
import type { Invoice, InvoiceCategory, StatementItem } from "@/lib/types";
import { errorMessage, logAudit, safeReturnPath, textValue, withMessage } from "@/lib/actions/shared";

export async function generateSummaryAction(formData: FormData) {
  const returnTo = safeReturnPath(formData, "/claims");
  let destination: string;
  try {
    const claimId = textValue(formData, "claim_id");
    const supabase = await createClient();
    const { data: claim, error: claimError } = await supabase.from("claims").select("*").eq("id", claimId).single();
    if (claimError || !claim) throw claimError ?? new Error("Claim not found");
    const { start, end } = monthBounds(claim.period_month);
    const [invoiceResult, statementResult] = await Promise.all([
      supabase.from("invoices").select("*").eq("claim_id", claimId),
      supabase
        .from("statement_items")
        .select("*")
        .eq("company_id", claim.company_id)
        .gte("transaction_date", start)
        .lt("transaction_date", end),
    ]);
    if (invoiceResult.error) throw invoiceResult.error;
    if (statementResult.error) throw statementResult.error;
    const invoices = (invoiceResult.data ?? []) as Invoice[];
    const statementItems = (statementResult.data ?? []) as StatementItem[];
    if (!invoices.length) throw new Error("Add at least one invoice before generating a summary");
    const categoryTotals: Record<InvoiceCategory, number> = { software: 0, ads: 0, office: 0, other: 0 };
    for (const invoice of invoices) categoryTotals[invoice.category] += Number(invoice.amount);
    for (const category of Object.keys(categoryTotals) as InvoiceCategory[]) {
      categoryTotals[category] = Math.round(categoryTotals[category] * 100) / 100;
    }
    const totalAmount = Math.round(invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0) * 100) / 100;
    const unmatched = statementItems.filter((item) => !item.matched);
    const varianceNotes = unmatched.length
      ? unmatched.map((item) => `${item.merchant} (${item.currency} ${Number(item.amount).toFixed(2)})`).join("; ")
      : "All statement charges in this period are matched.";
    const payload = {
      claim_id: claimId,
      total_amount: totalAmount,
      category_totals: categoryTotals,
      unmatched_count: unmatched.length,
      variance_notes: varianceNotes,
      narrative_source: "rule-based",
      narrative_review_status: "unreviewed",
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("expenditure_summaries")
      .upsert(payload, { onConflict: "claim_id" })
      .select()
      .single();
    if (error) throw error;
    await logAudit({ action: "summary.generated", entityType: "expenditure_summary", entityId: data.id, after: data });
    revalidatePath("/");
    revalidatePath(`/claims/${claimId}`);
    revalidatePath("/exports");
    destination = withMessage(returnTo, "notice", "Executive summary regenerated from the latest records.");
  } catch (error) {
    destination = withMessage(returnTo, "error", errorMessage(error));
  }
  redirect(destination);
}
