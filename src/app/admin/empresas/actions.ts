"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdminEmail } from "@/lib/admin-session";

type FormState = { error?: string; ok?: string } | undefined;

/**
 * Verificação da empresa (KYB).
 *
 * Enquanto não aprovada, a empresa não aparece nas views públicas e não
 * consegue publicar campanha — publicar é endosso, e endosso sem verificação
 * é responsabilidade que a plataforma não tem como sustentar.
 */
export async function decidirKyb(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await getAdminEmail();
  if (!admin) return { error: "Sessão administrativa expirada." };

  const id = String(formData.get("empresaId") ?? "");
  const decisao = String(formData.get("decisao") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!id) return { error: "Empresa não informada." };
  if (decisao !== "aprovada" && decisao !== "reprovada") {
    return { error: "Decisão inválida." };
  }
  if (decisao === "reprovada" && motivo.length < 15) {
    return { error: "Descreva o motivo — a empresa precisa saber o que corrigir." };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("empresas")
    .update({
      kyb_status: decisao,
      kyb_revisado_em: new Date().toISOString(),
      kyb_motivo_reprovacao: decisao === "reprovada" ? motivo : null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível registrar a decisão agora." };

  await supabase.from("audit_log").insert({
    actor_id: null,
    actor_role: "admin",
    action: `empresa.kyb_${decisao}`,
    target_table: "empresas",
    target_id: id,
    metadata: { admin_email: admin, motivo: motivo || null },
  });

  revalidatePath("/admin/empresas");
  return {
    ok: decisao === "aprovada" ? "Empresa aprovada — já pode publicar campanhas." : "Reprovação registrada.",
  };
}

/**
 * Selo público de pendência de pagamento — política 06 §5.5 (10 dias de
 * atraso) e §9.2. É fato objetivo apurado pela plataforma, e sua publicação
 * integra os Termos aceitos pela empresa.
 */
export async function alternarSeloPendencia(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await getAdminEmail();
  if (!admin) return { error: "Sessão administrativa expirada." };

  const id = String(formData.get("empresaId") ?? "");
  const ativar = formData.get("ativar") === "1";
  if (!id) return { error: "Empresa não informada." };

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("empresas")
    .update({ selo_pendencia_pagamento: ativar })
    .eq("id", id);

  if (error) return { error: "Não foi possível atualizar o selo agora." };

  await supabase.from("audit_log").insert({
    actor_id: null,
    actor_role: "admin",
    action: ativar ? "empresa.selo_pendencia_aplicado" : "empresa.selo_pendencia_removido",
    target_table: "empresas",
    target_id: id,
    metadata: { admin_email: admin },
  });

  revalidatePath("/admin/empresas");
  return { ok: ativar ? "Selo aplicado — visível em todas as campanhas da empresa." : "Selo removido." };
}
