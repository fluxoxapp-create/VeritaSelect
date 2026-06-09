"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function setRaffleStatus(id: string, status: string) {
  const supabase = createSupabaseAdminClient();
  await supabase.from("raffles").update({ status }).eq("id", id);
  revalidatePath(`/admin/selecoes/${id}`);
  revalidatePath("/admin");
}

export async function pauseRaffle(id: string) {
  await setRaffleStatus(id, "paused");
}

export async function resumeRaffle(id: string) {
  await setRaffleStatus(id, "published");
}

export async function cancelRaffle(id: string) {
  await setRaffleStatus(id, "cancelled");
}

export async function startDrawing(id: string) {
  await setRaffleStatus(id, "drawing");
}

export async function registerDrawResult(_prevState: { error: string | null } | undefined, formData: FormData) {
  const raffleId = String(formData.get("raffleId") ?? "").trim();
  const lotteryResult = String(formData.get("lotteryResult") ?? "").trim().replace(/\D/g, "");
  const concurso = String(formData.get("concurso") ?? "").trim();

  if (!raffleId) return { error: "Seleção não identificada." };
  if (lotteryResult.length !== 5) return { error: "Informe os 5 dígitos do resultado da Loteria Federal." };

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.rpc("register_draw_result", {
    p_raffle_id: raffleId,
    p_lottery_result: lotteryResult,
    p_lottery_concurso: concurso || null,
  });

  if (error) {
    return { error: error.message.includes("No paid cota found") ? "Nenhuma cota paga encontrada para esse número (verifique se há compras confirmadas)." : `Erro ao registrar resultado: ${error.message}` };
  }

  revalidatePath(`/admin/selecoes/${raffleId}`);
  revalidatePath("/admin");
  return { error: null, winningCota: data as number };
}
