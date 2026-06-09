"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type State = { error: string | null; success?: boolean } | undefined;

export async function approveKyc(_prevState: State, formData: FormData): Promise<State> {
  const organizerId = String(formData.get("organizerId") ?? "").trim();
  if (!organizerId) return { error: "ID inválido." };

  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("organizers")
    .update({
      kyc_status: "approved",
      is_verified: true,
      kyc_rejection_reason: null,
    })
    .eq("id", organizerId);

  if (error) return { error: "Erro ao aprovar." };

  await admin.from("audit_log").insert({
    actor_id: null, actor_role: "admin",
    action: "kyc.approved",
    target_table: "organizers", target_id: organizerId,
    metadata: {},
  });

  revalidatePath(`/admin/kyc/${organizerId}`);
  revalidatePath("/admin/kyc");
  return { error: null, success: true };
}

export async function rejectKyc(_prevState: State, formData: FormData): Promise<State> {
  const organizerId = String(formData.get("organizerId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!organizerId) return { error: "ID inválido." };
  if (!reason) return { error: "Informe o motivo da reprovação." };

  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("organizers")
    .update({
      kyc_status: "rejected",
      is_verified: false,
      kyc_rejection_reason: reason,
    })
    .eq("id", organizerId);

  if (error) return { error: "Erro ao reprovar." };

  await admin.from("audit_log").insert({
    actor_id: null, actor_role: "admin",
    action: "kyc.rejected",
    target_table: "organizers", target_id: organizerId,
    metadata: { reason },
  });

  revalidatePath(`/admin/kyc/${organizerId}`);
  revalidatePath("/admin/kyc");
  return { error: null, success: true };
}
