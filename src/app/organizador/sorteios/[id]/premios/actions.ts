"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function addPrize(_prevState: { error: string | null } | undefined, formData: FormData) {
  const raffleId = String(formData.get("raffleId") ?? "");
  const prizeNumberRaw = Number.parseInt(String(formData.get("prizeNumber") ?? ""), 10);
  const description = String(formData.get("description") ?? "").trim();
  const revealAtPct = Number.parseInt(String(formData.get("revealAtPct") ?? "0"), 10);

  if (!raffleId || !Number.isInteger(prizeNumberRaw) || prizeNumberRaw <= 0) {
    return { error: "Número do prêmio inválido." };
  }
  if (!description) return { error: "Descrição do prêmio obrigatória." };
  if (![0, 25, 50, 75, 100].includes(revealAtPct)) return { error: "Gatilho de revelação inválido." };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // Verify ownership and draft status
  const { data: raffle } = await supabase
    .from("raffles")
    .select("id, total_cotas, status")
    .eq("id", raffleId)
    .eq("organizer_id", user.id)
    .maybeSingle();

  if (!raffle) return { error: "Seleção não encontrada." };
  if (raffle.status !== "draft") return { error: "Prêmios só podem ser alterados em rascunho." };
  if (prizeNumberRaw > raffle.total_cotas) {
    return { error: `O número ${prizeNumberRaw} é maior que o total de acessos (${raffle.total_cotas}).` };
  }

  const { error } = await supabase.from("raffle_prizes").insert({
    raffle_id: raffleId,
    prize_number: prizeNumberRaw,
    prize_description: description,
    reveal_at_pct: revealAtPct,
  });

  if (error) {
    return { error: error.code === "23505" ? "Esse número já tem um prêmio cadastrado." : "Erro ao salvar prêmio." };
  }

  revalidatePath(`/organizador/sorteios/${raffleId}/premios`);
  return { error: null };
}

export async function removePrize(prizeId: string, raffleId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // RLS policy already guards this, but validate draft status too
  const { data: raffle } = await supabase
    .from("raffles")
    .select("status")
    .eq("id", raffleId)
    .eq("organizer_id", user.id)
    .maybeSingle();

  if (raffle?.status !== "draft") return;

  await supabase.from("raffle_prizes").delete().eq("id", prizeId);
  revalidatePath(`/organizador/sorteios/${raffleId}/premios`);
}
