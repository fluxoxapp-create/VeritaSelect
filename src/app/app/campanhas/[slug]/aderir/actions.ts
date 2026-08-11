"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireParceiro } from "@/lib/auth/session";
import { registrarAceite } from "@/lib/aceite";
import {
  montarContrato,
  VERSAO_CONTRATO,
  type DadosContrato,
} from "@/lib/domain/contrato-campanha";

type FormState = { error?: string; redirectTo?: string } | undefined;

/**
 * Adesão à campanha.
 *
 * Gera o Contrato de Campanha (documento 03) e o congela: o texto é
 * renderizado com os valores REAIS daquela campanha naquele momento, hasheado
 * em SHA-256 e gravado com IP e timestamp. Se a empresa alterar a campanha
 * depois, o contrato deste parceiro continua sendo este.
 *
 * O aceite é gravado ANTES da adesão de propósito. Sem prova congelada a
 * adesão não deveria existir — e `registrarAceite` lança se não conseguir
 * gravar, abortando a operação inteira.
 */
export async function aderirCampanha(_prev: FormState, formData: FormData): Promise<FormState> {
  const sessao = await requireParceiro();
  const slug = String(formData.get("slug") ?? "");
  const aceitou = formData.get("aceite") === "on";

  if (!slug) return { error: "Campanha não informada." };
  if (!aceitou) return { error: "É preciso aceitar o Contrato de Campanha para aderir." };

  const supabase = await createSupabaseServerClient();
  const { data: campanha } = await supabase
    .from("campanhas_public")
    .select(
      "id, slug, titulo, produto, empresa_nome, atividade_parceiro, comissao_cents, comissao_recorrente, publico_alvo, resultado_util, prazo_analise_dias, prazo_pagamento_dias, janela_atribuicao_dias, janela_estorno_dias, exige_certificacao, status, territorio_ufs",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!campanha) return { error: "Campanha não encontrada." };
  if (campanha.status !== "publicada") {
    return { error: "Esta campanha não está aceitando novas adesões." };
  }

  const contrato = montarContrato(campanha as unknown as DadosContrato, sessao.nomeCompleto);

  const { id: aceiteId } = await registrarAceite({
    profileId: sessao.userId,
    documentoTipo: "contrato_campanha",
    documentoVersao: VERSAO_CONTRATO,
    conteudo: contrato,
    campanhaId: campanha.id as string,
  });

  const { data: adesao, error } = await supabase
    .from("adesoes")
    .insert({
      campanha_id: campanha.id,
      parceiro_id: sessao.userId,
      status: "ativa",
      certificacao: campanha.exige_certificacao ? "pendente" : "nao_exigida",
      aceite_id: aceiteId,
    })
    .select("id")
    .single();

  if (error || !adesao) {
    if (error?.code === "23505") return { error: "Você já aderiu a esta campanha." };
    return { error: "Não foi possível concluir a adesão agora. Tente novamente." };
  }

  const admin = createSupabaseAdminClient();
  await admin.from("audit_log").insert({
    actor_id: sessao.userId,
    actor_role: "parceiro",
    action: "adesao.criada",
    target_table: "adesoes",
    target_id: adesao.id,
    metadata: { campanha_id: campanha.id, aceite_id: aceiteId, versao: VERSAO_CONTRATO },
  });

  revalidatePath("/app/campanhas");
  revalidatePath(`/campanhas/${slug}`);
  return { redirectTo: campanha.exige_certificacao ? "/app/campanhas" : "/app/indicacoes/nova" };
}
