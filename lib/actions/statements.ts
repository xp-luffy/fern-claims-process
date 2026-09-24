"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { errorMessage, logAudit, safeReturnPath, textValue, withMessage } from "@/lib/actions/shared";
import { numberValue } from "@/lib/actions/shared";

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
}

function parseStatementCsv(csv: string, companyId: string) {
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV must include a header row and at least one transaction");
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase().replaceAll(" ", "_"));
  const find = (...names: string[]) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
  const merchantIndex = find("merchant", "vendor", "description");
  const amountIndex = find("amount", "total");
  const dateIndex = find("transaction_date", "date", "posted_date");
  const currencyIndex = find("currency");
  if (merchantIndex < 0 || amountIndex < 0 || dateIndex < 0) {
    throw new Error("CSV headers must include merchant, amount, and date");
  }

  return lines.slice(1).map((line, rowIndex) => {
    const values = parseCsvLine(line);
    const amount = Number(values[amountIndex]?.replace(/[$,]/g, ""));
    const rawDate = values[dateIndex];
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : new Date(rawDate).toISOString().slice(0, 10);
    if (!values[merchantIndex] || !Number.isFinite(amount) || !parsedDate) throw new Error(`Invalid data on CSV row ${rowIndex + 2}`);
    return {
      company_id: companyId,
      merchant: values[merchantIndex],
      amount: Math.abs(Math.round(amount * 100) / 100),
      currency: (currencyIndex >= 0 ? values[currencyIndex] : "USD").toUpperCase() || "USD",
      transaction_date: parsedDate,
    };
  });
}

export async function importStatementAction(formData: FormData) {
  const returnTo = safeReturnPath(formData, "/statements");
  let destination: string;
  try {
    const companyId = textValue(formData, "company_id");
    const file = formData.get("statement_file");
    let csv = textValue(formData, "csv", false);
    if (file instanceof File && file.size > 0) csv = await file.text();
    if (!csv) throw new Error("Paste CSV rows or choose a CSV file");
    const rows = parseStatementCsv(csv, companyId);
    const supabase = await createClient();
    const { data, error } = await supabase.from("statement_items").insert(rows).select();
    if (error) throw error;
    if (data?.[0]) {
      await logAudit({
        action: "statement.imported",
        entityType: "statement_item",
        entityId: data[0].id,
        after: { imported_count: data.length, company_id: companyId },
      });
    }
    revalidatePath("/");
    revalidatePath("/statements");
    revalidatePath("/claims");
    destination = withMessage(returnTo, "notice", `${rows.length} statement item${rows.length === 1 ? "" : "s"} imported.`);
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
