import { createClient } from "@/lib/supabase/server";
import type { ExpenditureSummary } from "@/lib/types";

export async function getSummary(claimId: string): Promise<ExpenditureSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("expenditure_summaries").select("*").eq("claim_id", claimId).maybeSingle();
  if (error) throw new Error(`Could not load expenditure summary: ${error.message}`);
  return data as ExpenditureSummary | null;
}
