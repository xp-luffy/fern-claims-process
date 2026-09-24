import { createClient } from "@/lib/supabase/server";

export function textValue(formData: FormData, key: string, required = true) {
  const value = String(formData.get(key) ?? "").trim();
  if (required && !value) throw new Error(`${key.replaceAll("_", " ")} is required`);
  return value;
}

export function numberValue(formData: FormData, key: string) {
  const raw = textValue(formData, key);
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${key.replaceAll("_", " ")} must be a valid positive number`);
  return Math.round(value * 100) / 100;
}

export function safeReturnPath(formData: FormData, fallback: string) {
  const value = String(formData.get("returnTo") ?? "");
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export function withMessage(path: string, key: "notice" | "error", value: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=${encodeURIComponent(value)}`;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function logAudit(input: {
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  riskLevel?: "low" | "medium" | "high";
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("audit_logs").insert({
    actor: "demo-user",
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    before_state: input.before ?? null,
    after_state: input.after ?? null,
    risk_level: input.riskLevel ?? "low",
  });
  if (error) console.error("Audit log failed", error.message);
}
