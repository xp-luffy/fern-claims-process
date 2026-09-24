"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ClaimStatus } from "@/lib/types";
import { errorMessage, logAudit, safeReturnPath, textValue, withMessage } from "@/lib/actions/shared";

export async function createClaimAction(formData: FormData) {
  let destination = "/claims";
  try {
    const companyId = textValue(formData, "company_id");
    const periodMonth = textValue(formData, "period_month");
    const notes = textValue(formData, "notes", false) || null;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("claims")
      .insert({ company_id: companyId, period_month: periodMonth, notes, status: "draft" })
      .select()
      .single();
    if (error) throw error;
    await logAudit({ action: "claim.created", entityType: "claim", entityId: data.id, after: data });
    revalidatePath("/");
    revalidatePath("/claims");
    destination = withMessage(`/claims/${data.id}`, "notice", "Claim created. Add invoices to begin.");
  } catch (error) {
    destination = withMessage("/claims", "error", errorMessage(error));
  }
  redirect(destination);
}

export async function updateClaimStatusAction(formData: FormData) {
  const returnTo = safeReturnPath(formData, "/claims");
  let destination: string;
  try {
    const id = textValue(formData, "id");
    const status = textValue(formData, "status") as ClaimStatus;
    if (!["draft", "submitted", "approved"].includes(status)) throw new Error("Invalid claim status");
    const supabase = await createClient();
    const { data: before } = await supabase.from("claims").select("*").eq("id", id).single();
    const { data, error } = await supabase.from("claims").update({ status }).eq("id", id).select().single();
    if (error) throw error;
    await logAudit({
      action: "claim.status_changed",
      entityType: "claim",
      entityId: id,
      before,
      after: data,
      riskLevel: status === "approved" ? "high" : "medium",
    });
    revalidatePath("/");
    revalidatePath("/claims");
    revalidatePath(`/claims/${id}`);
    destination = withMessage(returnTo, "notice", `Claim marked ${status}.`);
  } catch (error) {
    destination = withMessage(returnTo, "error", errorMessage(error));
  }
  redirect(destination);
}

export async function deleteClaimAction(formData: FormData) {
  const returnTo = safeReturnPath(formData, "/claims");
  let destination: string;
  try {
    const id = textValue(formData, "id");
    const supabase = await createClient();
    const { data: before } = await supabase.from("claims").select("*").eq("id", id).single();
    const { error } = await supabase.from("claims").delete().eq("id", id);
    if (error) throw error;
    await logAudit({ action: "claim.deleted", entityType: "claim", entityId: id, before, riskLevel: "high" });
    revalidatePath("/");
    revalidatePath("/claims");
    destination = withMessage(returnTo, "notice", "Claim deleted. Its invoices are now unassigned.");
  } catch (error) {
    destination = withMessage(returnTo, "error", errorMessage(error));
  }
  redirect(destination);
}
