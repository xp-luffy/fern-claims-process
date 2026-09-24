import { createClient } from "@/lib/supabase/server";
import type { Invoice, InvoiceWithRelations } from "@/lib/types";

export async function listInvoices(): Promise<InvoiceWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*, company:companies(*), claim:claims(id, period_month)")
    .order("invoice_date", { ascending: false });
  if (error) throw new Error(`Could not load invoices: ${error.message}`);
  return (data ?? []) as unknown as InvoiceWithRelations[];
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load invoice: ${error.message}`);
  return data as Invoice | null;
}

export async function createInvoiceFileUrl(path: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("invoices").createSignedUrl(path, 60 * 10);
  if (error) throw new Error(`Could not open invoice file: ${error.message}`);
  return data.signedUrl;
}
