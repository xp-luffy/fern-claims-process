import { createClient } from "@/lib/supabase/server";
import type { StatementItem, StatementWithCompany } from "@/lib/types";

export async function listStatementItems(): Promise<StatementWithCompany[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("statement_items")
    .select("*, company:companies(*)")
    .order("transaction_date", { ascending: false });
  if (error) throw new Error(`Could not load statement items: ${error.message}`);
  return (data ?? []) as unknown as StatementWithCompany[];
}

export async function getStatementItem(id: string): Promise<StatementItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("statement_items").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load statement item: ${error.message}`);
  return data as StatementItem | null;
}
