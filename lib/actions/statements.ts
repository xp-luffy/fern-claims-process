"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { errorMessage, logAudit, numberValue, safeReturnPath, textValue, withMessage } from "@/lib/actions/shared";
import { parseStatementCsv, parseStatementPdf, type StatementDateFormat } from "@/lib/statements/parse";

export async function importStatementAction(formData: FormData) {
  const returnTo = safeReturnPath(formData, "/statements");
  let destination: string;
  try {
    const companyId = textValue(formData, "company_id");
    const file = formData.get("statement_file");
    const defaultCurrency = (textValue(formData, "default_currency", false) || "USD").toUpperCase();
    const dateFormatValue = textValue(formData, "date_format", false) || "auto";
    if (!["auto", "mdy", "dmy"].includes(dateFormatValue)) throw new Error("Unsupported statement date format");
    const dateFormat = dateFormatValue as StatementDateFormat;
    const statementYearValue = textValue(formData, "statement_year", false);
    const statementYear = statementYearValue ? Number(statementYearValue) : undefined;
    if (statementYear && (statementYear < 2000 || statementYear > 2100)) throw new Error("Statement year is invalid");

    let source = "pasted CSV";
    let pageCount: number | undefined;
    let parsedRows;
    if (file instanceof File && file.size > 0) {
      if (file.size > 10 * 1024 * 1024) throw new Error("Statement files are limited to 10 MB");
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        const parsed = await parseStatementPdf(new Uint8Array(await file.arrayBuffer()), { dateFormat, defaultCurrency, statementYear });
        parsedRows = parsed.rows;
        pageCount = parsed.pageCount;
        source = file.name || "PDF statement";
      } else {
        parsedRows = parseStatementCsv(await file.text(), defaultCurrency);
        source = file.name || "CSV statement";
      }
    } else {
      const csv = textValue(formData, "csv", false);
      if (!csv) throw new Error("Choose a PDF/CSV statement or paste CSV rows");
      parsedRows = parseStatementCsv(csv, defaultCurrency);
    }
    const rows = parsedRows.map((row) => ({ company_id: companyId, ...row }));
    const supabase = await createClient();
    const { data, error } = await supabase.from("statement_items").insert(rows).select();
    if (error) throw error;
    if (data?.[0]) {
      await logAudit({
        action: "statement.imported",
        entityType: "statement_item",
        entityId: data[0].id,
        after: { imported_count: data.length, company_id: companyId, source, page_count: pageCount ?? null },
      });
    }
    revalidatePath("/");
    revalidatePath("/statements");
    revalidatePath("/claims");
    destination = withMessage(
      returnTo,
      "notice",
      `${rows.length} statement item${rows.length === 1 ? "" : "s"} imported from ${source}${pageCount ? ` (${pageCount} page${pageCount === 1 ? "" : "s"})` : ""}. Review the extracted rows before matching.`,
    );
  } catch (error) {
    destination = withMessage(returnTo, "error", errorMessage(error));
  }
  redirect(destination);
}

export async function deleteStatementItemAction(formData: FormData) {
  const returnTo = safeReturnPath(formData, "/statements");
  let destination: string;
  try {
    const id = textValue(formData, "id");
    const supabase = await createClient();
    const { data: item, error: loadError } = await supabase.from("statement_items").select("*").eq("id", id).single();
    if (loadError || !item) throw loadError ?? new Error("Statement item not found");
    if (item.matched_invoice_id) {
      const { error } = await supabase
        .from("invoices")
        .update({ statement_item_id: null, match_status: "unmatched" })
        .eq("id", item.matched_invoice_id);
      if (error) throw error;
    }
    const { error } = await supabase.from("statement_items").delete().eq("id", id);
    if (error) throw error;
    await logAudit({ action: "statement.deleted", entityType: "statement_item", entityId: id, before: item, riskLevel: "high" });
    revalidatePath("/");
    revalidatePath("/statements");
    revalidatePath("/claims");
    destination = withMessage(returnTo, "notice", "Statement item deleted.");
  } catch (error) {
    destination = withMessage(returnTo, "error", errorMessage(error));
  }
  redirect(destination);
}

export async function updateStatementItemAction(formData: FormData) {
  const returnTo = safeReturnPath(formData, "/statements");
  let destination: string;
  try {
    const id = textValue(formData, "id");
    const merchant = textValue(formData, "merchant");
    const amount = numberValue(formData, "amount");
    const currency = textValue(formData, "currency").toUpperCase();
    const transactionDate = textValue(formData, "transaction_date");
    const supabase = await createClient();
    const { data: before } = await supabase.from("statement_items").select("*").eq("id", id).single();
    const { data, error } = await supabase
      .from("statement_items")
      .update({ merchant, amount, currency, transaction_date: transactionDate })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (data.matched_invoice_id) {
      await supabase.from("invoices").update({ match_status: "flagged" }).eq("id", data.matched_invoice_id);
    }
    await logAudit({ action: "statement.updated", entityType: "statement_item", entityId: id, before, after: data });
    revalidatePath("/");
    revalidatePath("/statements");
    revalidatePath("/invoices");
    revalidatePath("/claims");
    destination = withMessage(returnTo, "notice", "Statement item updated. Any existing match was flagged for review.");
  } catch (error) {
    destination = withMessage(returnTo, "error", errorMessage(error));
  }
  redirect(destination);
}
