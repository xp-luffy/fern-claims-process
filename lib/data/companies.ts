import { createClient } from "@/lib/supabase/server";
import type { Company } from "@/lib/types";

export async function listCompanies(): Promise<Company[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").select("*").order("name");
  if (error) throw new Error(`Could not load companies: ${error.message}`);
  return (data ?? []) as Company[];
}

export async function getCompany(id: string): Promise<Company | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load company: ${error.message}`);
  return data as Company | null;
}
