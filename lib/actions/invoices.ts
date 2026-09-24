"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { categoriseVendor } from "@/lib/matching";
import { slugifyFileName } from "@/lib/utils";
import type { InvoiceCategory } from "@/lib/types";
import { errorMessage, logAudit, numberValue, safeReturnPath, textValue, withMessage } from "@/lib/actions/shared";

export async function createInvoiceAction(formData: FormData) {
  const returnTo = safeReturnPath(formData, "/invoices");
  let destination: string;
  let uploadedPath: string | null = null;
  try {
    const companyId = textValue(formData, "company_id");
    const claimId = textValue(formData, "claim_id", false) || null;
    const vendor = textValue(formData, "vendor");
    const amount = numberValue(formData, "amount");
    const currency = textValue(formData, "currency").toUpperCase();
    const invoiceDate = textValue(formData, "invoice_date");
    const selectedCategory = textValue(formData, "category", false);
    const category: InvoiceCategory = selectedCategory === "auto" || !selectedCategory
      ? categoriseVendor(vendor)
      : selectedCategory as InvoiceCategory;
    if (!["software", "ads", "office", "other"].includes(category)) throw new Error("Invalid invoice category");

    const file = formData.get("invoice_file");
    const supabase = await createClient();
    if (claimId) {
      const { data: claim, error: claimError } = await supabase.from("claims").select("company_id").eq("id", claimId).single();
      if (claimError || !claim) throw claimError ?? new Error("Claim not found");
      if (claim.company_id !== companyId) throw new Error("Selected claim belongs to a different company");
    }
    if (file instanceof File && file.size > 0) {
      if (file.size > 10 * 1024 * 1024) throw new Error("Invoice file must be 10 MB or smaller");
      const allowed = ["application/pdf", "image/png", "image/jpeg"];
      if (!allowed.includes(file.type)) throw new Error("Invoice file must be a PDF, PNG, or JPEG");
      uploadedPath = `${companyId}/${crypto.randomUUID()}-${slugifyFileName(file.name)}`;
      const { error } = await supabase.storage.from("invoices").upload(uploadedPath, file, { contentType: file.type });
      if (error) throw new Error(`File upload failed: ${error.message}`);
    }

    const { data, error } = await supabase
      .from("invoices")
      .insert({
        company_id: companyId,
        claim_id: claimId,
        vendor,
        amount,
        currency,
        invoice_date: invoiceDate,
        category,
        source: uploadedPath ? "upload" : "manual",
        file_path: uploadedPath,
      })
      .select()
      .single();
    if (error) {
      if (uploadedPath) await supabase.storage.from("invoices").remove([uploadedPath]);
      throw error;
    }
    await logAudit({ action: "invoice.created", entityType: "invoice", entityId: data.id, after: data });
    revalidatePath("/");
    revalidatePath("/invoices");
    revalidatePath("/claims");
    if (claimId) revalidatePath(`/claims/${claimId}`);
    destination = withMessage(returnTo, "notice", `${vendor} invoice added.`);
  } catch (error) {
    destination = withMessage(returnTo, "error", errorMessage(error));
  }
  redirect(destination);
}

export async function attachInvoiceAction(formData: FormData) {
  const returnTo = safeReturnPath(formData, "/claims");
  let destination: string;
  try {
    const invoiceId = textValue(formData, "invoice_id");
    const claimId = textValue(formData, "claim_id");
    const supabase = await createClient();
    const [{ data: invoice }, { data: claim }] = await Promise.all([
      supabase.from("invoices").select("*").eq("id", invoiceId).single(),
      supabase.from("claims").select("*").eq("id", claimId).single(),
    ]);
    if (!invoice || !claim) throw new Error("Invoice or claim not found");
    if (invoice.company_id !== claim.company_id) throw new Error("Invoice belongs to a different company");
    const { data, error } = await supabase.from("invoices").update({ claim_id: claimId }).eq("id", invoiceId).select().single();
    if (error) throw error;
    await logAudit({ action: "invoice.attached", entityType: "invoice", entityId: invoiceId, before: invoice, after: data });
    revalidatePath("/invoices");
    revalidatePath(`/claims/${claimId}`);
    destination = withMessage(returnTo, "notice", "Invoice attached to this claim.");
  } catch (error) {
    destination = withMessage(returnTo, "error", errorMessage(error));
  }
  redirect(destination);
}

export async function updateInvoiceAction(formData: FormData) {
  const returnTo = safeReturnPath(formData, "/invoices");
  let destination: string;
  try {
    const id = textValue(formData, "id");
    const vendor = textValue(formData, "vendor");
    const amount = numberValue(formData, "amount");
    const currency = textValue(formData, "currency").toUpperCase();
    const invoiceDate = textValue(formData, "invoice_date");
    const category = textValue(formData, "category") as InvoiceCategory;
    if (!["software", "ads", "office", "other"].includes(category)) throw new Error("Invalid invoice category");
    const supabase = await createClient();
    const { data: before } = await supabase.from("invoices").select("*").eq("id", id).single();
    const patch = { vendor, amount, currency, invoice_date: invoiceDate, category, match_status: before?.statement_item_id ? "flagged" : "unmatched" };
    const { data, error } = await supabase.from("invoices").update(patch).eq("id", id).select().single();
    if (error) throw error;
    await logAudit({ action: "invoice.updated", entityType: "invoice", entityId: id, before, after: data });
    revalidatePath("/");
    revalidatePath("/invoices");
    if (data.claim_id) revalidatePath(`/claims/${data.claim_id}`);
    destination = withMessage(returnTo, "notice", "Invoice updated. Existing matches were flagged for review.");
  } catch (error) {
    destination = withMessage(returnTo, "error", errorMessage(error));
  }
  redirect(destination);
}

export async function deleteInvoiceAction(formData: FormData) {
  const returnTo = safeReturnPath(formData, "/invoices");
  let destination: string;
  try {
    const id = textValue(formData, "id");
    const supabase = await createClient();
    const { data: invoice, error: loadError } = await supabase.from("invoices").select("*").eq("id", id).single();
    if (loadError || !invoice) throw loadError ?? new Error("Invoice not found");
    if (invoice.statement_item_id) {
      const { error } = await supabase
        .from("statement_items")
        .update({ matched: false, matched_invoice_id: null })
        .eq("id", invoice.statement_item_id);
      if (error) throw error;
    }
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) throw error;
    if (invoice.file_path) await supabase.storage.from("invoices").remove([invoice.file_path]);
    await logAudit({ action: "invoice.deleted", entityType: "invoice", entityId: id, before: invoice, riskLevel: "high" });
    revalidatePath("/");
    revalidatePath("/invoices");
    revalidatePath("/claims");
    if (invoice.claim_id) revalidatePath(`/claims/${invoice.claim_id}`);
    destination = withMessage(returnTo, "notice", "Invoice deleted.");
  } catch (error) {
    destination = withMessage(returnTo, "error", errorMessage(error));
  }
  redirect(destination);
}
