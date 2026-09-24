"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { errorMessage, logAudit, safeReturnPath, textValue, withMessage } from "@/lib/actions/shared";

export async function createCompanyAction(formData: FormData) {
  const returnTo = safeReturnPath(formData, "/companies");
  let destination: string;
  try {
    const name = textValue(formData, "name");
    const supabase = await createClient();
    const { data, error } = await supabase.from("companies").insert({ name }).select().single();
    if (error) throw error;
    await logAudit({ action: "company.created", entityType: "company", entityId: data.id, after: data });
    revalidatePath("/");
    revalidatePath("/companies");
    destination = withMessage(returnTo, "notice", `${name} was added.`);
  } catch (error) {
    destination = withMessage(returnTo, "error", errorMessage(error));
  }
  redirect(destination);
}

export async function updateCompanyAction(formData: FormData) {
  const returnTo = safeReturnPath(formData, "/companies");
  let destination: string;
  try {
    const id = textValue(formData, "id");
    const name = textValue(formData, "name");
    const supabase = await createClient();
    const { data: before } = await supabase.from("companies").select("*").eq("id", id).single();
    const { data, error } = await supabase.from("companies").update({ name }).eq("id", id).select().single();
    if (error) throw error;
    await logAudit({ action: "company.updated", entityType: "company", entityId: id, before, after: data });
    revalidatePath("/");
    revalidatePath("/companies");
    destination = withMessage(returnTo, "notice", "Company updated.");
  } catch (error) {
    destination = withMessage(returnTo, "error", errorMessage(error));
  }
  redirect(destination);
}

export async function deleteCompanyAction(formData: FormData) {
  const returnTo = safeReturnPath(formData, "/companies");
  let destination: string;
  try {
    const id = textValue(formData, "id");
    const supabase = await createClient();
    const { data: before } = await supabase.from("companies").select("*").eq("id", id).single();
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) throw error;
    await logAudit({ action: "company.deleted", entityType: "company", entityId: id, before, riskLevel: "high" });
    revalidatePath("/");
    revalidatePath("/companies");
    destination = withMessage(returnTo, "notice", "Company and its records were deleted.");
  } catch (error) {
    destination = withMessage(returnTo, "error", errorMessage(error));
  }
  redirect(destination);
}
