"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireEmpresa } from "@/lib/auth/session";
import { MOTIVOS_RECUSA, type MotivoRecusa, type IndicacaoStatus } from "@/lib/domain/indicacoes";

type FormState = { error?: string; ok?: string } | undefined;

/**
 * Análise da indicação pela empresa.
 *
 * A escrita passa pelo cliente RLS-scoped de propósito: a policy
 * `empresa analisa indicacoes recebidas` é quem garante que ninguém aprove
 * indicação de outro tenant. Se este código errasse o filtro, o banco ainda
 * recusaria — o isolamento não depende de eu lembrar do `where`.
 *
 * A linha do tempo (`indicacao_eventos`) e o `audit_log` são append-only e só
 * aceitam escrita por service-role, então usam o cliente privilegiado.
 */
async function registrarEvento(params: {
  indicacaoId: string;
  de: IndicacaoStatus;
  para: IndicacaoStatus;
  atorId: string;
  observacao?: string;
}) {
  const admin = createSupabaseAdminClient();
  await Promise.all([
    admin.from("indicacao_eventos").insert({
      indicacao_id: params.indicacaoId,
      de_status: params.de,
      para_status: params.para,
      ator_id: params.atorId,
      ator_papel: "empresa",
      automatico: false,
      observacao: params.observacao ?? null,
    }),
    admin.from("audit_log").insert({
      actor_id: params.atorId,
      actor_role: "empresa",
      action: `indicacao.${params.para}`,
      target_table: "indicacoes",
      target_id: params.indicacaoId,
      metadata: { de: params.de, para: params.para, observacao: params.observacao ?? null },
    }),
  ]);
}

/** Busca a indicação e a campanha dela, já limitada ao tenant pela RLS. */
async function carregarParaAnalise(indicacaoId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("indicacoes")
    .select("id, status, campanhas(prazo_pagamento_dias, janela_estorno_dias)")
    .eq("id", indicacaoId)
    .maybeSingle();
  return data as unknown as
    | {
        id: string;
        status: IndicacaoStatus;
        campanhas: { prazo_pagamento_dias: number; janela_estorno_dias: number } | null;
      }
    | null;
}

export async function aprovarIndicacao(_prev: FormState, formData: FormData): Promise<FormState> {
  const sessao = await requireEmpresa();
  const id = String(formData.get("indicacaoId") ?? "");
  if (!id) return { error: "Indicação não informada." };

  const indicacao = await carregarParaAnalise(id);
  if (!indicacao) return { error: "Indicação não encontrada." };
  if (indicacao.status !== "registrada" && indicacao.status !== "em_analise") {
    return { error: "Esta indicação não está mais em análise." };
  }

  const agora = new Date();
  const prazoPagamento = new Date(agora);
  prazoPagamento.setDate(
    prazoPagamento.getDate() + (indicacao.campanhas?.prazo_pagamento_dias ?? 15),
  );
  const janelaEstorno = new Date(agora);
  janelaEstorno.setDate(janelaEstorno.getDate() + (indicacao.campanhas?.janela_estorno_dias ?? 30));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("indicacoes")
    .update({
      status: "aprovada",
      analisada_por: sessao.userId,
      analisada_em: agora.toISOString(),
      aprovacao_tacita: false,
      prazo_pagamento_em: prazoPagamento.toISOString(),
      janela_estorno_ate: janelaEstorno.toISOString(),
      // Limpa qualquer recusa anterior que tenha voltado para análise.
      motivo_recusa: null,
      motivo_recusa_detalhe: null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível aprovar agora. Tente novamente." };

  await registrarEvento({
    indicacaoId: id,
    de: indicacao.status,
    para: "aprovada",
    atorId: sessao.userId,
  });

  revalidatePath("/empresa/indicacoes");
  revalidatePath("/empresa");
  return { ok: "Indicação aprovada. A comissão entra na sua fila de pagamento." };
}

export async function recusarIndicacao(_prev: FormState, formData: FormData): Promise<FormState> {
  const sessao = await requireEmpresa();
  const id = String(formData.get("indicacaoId") ?? "");
  const motivo = String(formData.get("motivo") ?? "");
  const detalhe = String(formData.get("detalhe") ?? "").trim();

  if (!id) return { error: "Indicação não informada." };

  // Lista FECHADA — política 06 §4.1. Recusa fora dela é inválida.
  if (!(MOTIVOS_RECUSA as readonly string[]).includes(motivo)) {
    return { error: "Escolha um dos motivos previstos na política de comissionamento." };
  }
  // §4.3: recusa sem fundamentação é inválida e devolve a indicação à análise.
  if (detalhe.length < 20) {
    return {
      error:
        "Descreva a justificativa com pelo menos 20 caracteres. Recusa genérica é inválida e devolve a indicação para análise com prazo reduzido.",
    };
  }

  const indicacao = await carregarParaAnalise(id);
  if (!indicacao) return { error: "Indicação não encontrada." };
  if (indicacao.status !== "registrada" && indicacao.status !== "em_analise") {
    return { error: "Esta indicação não está mais em análise." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("indicacoes")
    .update({
      status: "recusada",
      analisada_por: sessao.userId,
      analisada_em: new Date().toISOString(),
      motivo_recusa: motivo as MotivoRecusa,
      motivo_recusa_detalhe: detalhe,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível recusar agora. Tente novamente." };

  await registrarEvento({
    indicacaoId: id,
    de: indicacao.status,
    para: "recusada",
    atorId: sessao.userId,
    observacao: `${motivo}: ${detalhe}`,
  });

  revalidatePath("/empresa/indicacoes");
  revalidatePath("/empresa");
  return { ok: "Recusa registrada. O parceiro tem 7 dias para contestar." };
}

/**
 * Registro da liquidação — a empresa declara que JÁ pagou o parceiro por meio
 * próprio. Isto não move dinheiro: a plataforma nunca esteve no caminho dele.
 */
export async function registrarLiquidacao(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const sessao = await requireEmpresa();
  const id = String(formData.get("indicacaoId") ?? "");
  if (!id) return { error: "Indicação não informada." };

  const indicacao = await carregarParaAnalise(id);
  if (!indicacao) return { error: "Indicação não encontrada." };
  if (indicacao.status !== "aprovada") {
    return { error: "Só é possível registrar liquidação de indicação aprovada." };
  }

  const agora = new Date().toISOString();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("indicacoes")
    .update({
      status: "paga",
      paga_em: agora,
      liquidacao_registrada_em: agora,
      liquidacao_registrada_por: sessao.userId,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível registrar a liquidação agora." };

  await registrarEvento({
    indicacaoId: id,
    de: "aprovada",
    para: "paga",
    atorId: sessao.userId,
  });

  revalidatePath("/empresa/indicacoes");
  return { ok: "Liquidação registrada. O parceiro foi notificado e pode contestar em 7 dias." };
}
