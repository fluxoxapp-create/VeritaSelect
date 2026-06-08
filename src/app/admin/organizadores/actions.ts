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
    target_table: "organizers",
    target_id: targetId,
    metadata: { admin_email: adminEmail, ...metadata },
  });
}

export async function approveOrganizer(formData: FormData) {
  const organizerId = String(formData.get("organizerId") ?? "");
  if (!organizerId) return;

  const adminEmail = await getAdminEmail();
  if (!adminEmail) return;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("organizers")
    .update({
      is_verified: true,
      kyc_status: "approved",
      kyc_reviewed_by: null,
      kyc_reviewed_at: new Date().toISOString(),
      kyc_rejection_reason: null,
    })
    .eq("id", organizerId)
    .eq("kyc_status", "pending")
    .select("id")
    .maybeSingle();

  if (!error && data) {
    await logAdminAction("organizer.approve", organizerId, { admin_email: adminEmail });
  }

  revalidatePath("/admin/organizadores");
}

export async function rejectOrganizer(formData: FormData) {
  const organizerId = String(formData.get("organizerId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!organizerId || !reason) return;

  const adminEmail = await getAdminEmail();
  if (!adminEmail) return;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("organizers")
    .update({
      is_verified: false,
      kyc_status: "rejected",
      kyc_reviewed_by: null,
      kyc_reviewed_at: new Date().toISOString(),
      kyc_rejection_reason: reason,
    })
    .eq("id", organizerId)
    .eq("kyc_status", "pending")
    .select("id")
    .maybeSingle();

  if (!error && data) {
    await logAdminAction("organizer.reject", organizerId, { reason });
  }

  revalidatePath("/admin/organizadores");
}
