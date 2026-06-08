"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdminEmail } from "@/lib/admin-session";

async function logAdminAction(action: string, targetId: string, metadata: Record<string, unknown>) {
  const adminEmail = await getAdminEmail();
  const supabase = createSupabaseAdminClient();
  await supabase.from("audit_log").insert({
    actor_id: null,
    actor_role: "admin",
    action,
    target_table: "raffles",
    target_id: targetId,
    metadata: { admin_email: adminEmail, ...metadata },
  });
}

export async function approveRaffle(formData: FormData) {
  const raffleId = String(formData.get("raffleId") ?? "");
  if (!raffleId) return;

  const adminEmail = await getAdminEmail();
  if (!adminEmail) return;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("raffles")
    .update({
      status: "published",
      reviewed_by: null,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", raffleId)
    .eq("status", "pending_review")
    .select("id")
    .maybeSingle();

  if (!error && data) {
    await logAdminAction("raffle.approve", raffleId, {});
  }

  revalidatePath("/admin/selecoes");
}

export async function rejectRaffle(formData: FormData) {
  const raffleId = String(formData.get("raffleId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!raffleId || !reason) return;

  const adminEmail = await getAdminEmail();
  if (!adminEmail) return;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("raffles")
    .update({
      status: "draft",
      reviewed_by: null,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq("id", raffleId)
    .eq("status", "pending_review")
    .select("id")
    .maybeSingle();

  if (!error && data) {
    await logAdminAction("raffle.reject", raffleId, { reason });
  }

  revalidatePath("/admin/selecoes");
}
