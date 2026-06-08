"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function submitRaffleForReview(formData: FormData) {
  const raffleId = String(formData.get("raffleId") ?? "");
  if (!raffleId) return;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("raffles")
    .update({ status: "pending_review", rejection_reason: null })
    .eq("id", raffleId)
    .eq("organizer_id", user.id)
    .eq("status", "draft");

  revalidatePath("/organizador/sorteios");
}
