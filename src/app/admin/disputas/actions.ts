"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdminEmail } from "@/lib/admin-session";
import type { IndicacaoStatus } from "@/lib/domain/indicacoes";

type FormState = { error?: string; ok?: string } | undefined;

type Decisao = "procedente" | "improcedente";

/**
 * Decisão administrativa da disputa — política 06 §7.
 *
 * Não é arbitragem e não é sentença: é decisão da plataforma sobre o que os
 * próprios registros dela mostram, e ambas as partes seguem com acesso pleno
 * ao Judiciário. Por isso a fundamentação é obrigatória e a ordem de peso das
 * provas está escrita na tela de quem decide.
 *
 * Efeito no ciclo de vida da indicação:
 *   procedente   → a recusa (ou o estorno) cai; a indicação volta a APROVADA
 *                  e o relógio de pagamento recomeça pelos prazos da campanha.
 *   improcedente → a indicação volta ao status que tinha antes da contestação.
 */
export async function decidirDisputa(_prev: FormState, formData: FormData): Promise<FormState> {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) return { error: "Sessão administrativa expirada." };

  const disputaId = String(formData.get("disputaId") ?? "");
  const decisao = String(formData.get("decisao") ?? "") as Decisao;
  const fundamentacao = String(formData.get("fundamentacao") ?? "").trim();

  if (!disputaId) return { error: "Disputa não informada." };
  if (decisao !== "procedente" && decisao !== "improcedente") {
    return { error: "Decisão inválida." };
  }
  if (fundamentacao.length < 30) {
    return {
      error:
        "Fundamente a decisão em pelo menos 30 caracteres, citando a prova que a sustenta. Decisão sem fundamentação não se defende depois.",
    };
  }

  const supabase = createSupabaseAdminClient();

  const { data } = await supabase
    .from("disputas")
    .select(
      "id, prazo_resposta_em, respondida_em, decidida_em, indicacao_id, indicacoes(id, status, campanhas(prazo_pagamento_dias, janela_estorno_dias))",
    )
    .eq("id", disputaId)
    .maybeSingle();

  const disputa = data as unknown as
    | {
        id: string;
        prazo_resposta_em: string;
        respondida_em: string | null;
        decidida_em: string | null;
        indicacao_id: string;
        indicacoes: {
          id: string;
          status: IndicacaoStatus;
          campanhas: { prazo_pagamento_dias: number; janela_estorno_dias: number } | null;
        } | null;
      }
    | null;

  if (!disputa) return { error: "Disputa não encontrada." };
  if (disputa.decidida_em) return { error: "Esta disputa já foi decidida." };
  if (!disputa.indicacoes) return { error: "Indicação da disputa não encontrada." };

  const silencioDaEmpresa =
    !disputa.respondida_em && new Date() > new Date(disputa.prazo_resposta_em);

  // §7: o silêncio da empresa implica procedência. A regra vale contra quem
  // decide também — não é discricionária.
  if (silencioDaEmpresa && decisao === "improcedente") {
    return {
      error:
        "A empresa não respondeu dentro do prazo. Pela política de comissionamento, o silêncio implica procedência da contestação — não cabe julgá-la improcedente.",
    };
  }

  // Ainda dentro do prazo de resposta a disputa não está madura: decidir agora
  // suprimiria o contraditório da empresa.
  if (!disputa.respondida_em && !silencioDaEmpresa) {
    return {
      error: "A empresa ainda está dentro do prazo de resposta. Aguarde o prazo ou a manifestação.",
    };
  }

  // Status anterior à contestação — a linha do tempo é a fonte, não um campo
  // paralelo que poderia divergir dela.
  const { data: evento } = await supabase
    .from("indicacao_eventos")
    .select("de_status")
    .eq("indicacao_id", disputa.indicacao_id)
    .eq("para_status", "em_disputa")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const statusAnterior = (evento?.de_status as IndicacaoStatus | undefined) ?? "recusada";

  const agora = new Date();
  const patch: Record<string, unknown> =
    decisao === "procedente"
      ? (() => {
          const prazoPagamento = new Date(agora);
          prazoPagamento.setDate(
            prazoPagamento.getDate() + (disputa.indicacoes!.campanhas?.prazo_pagamento_dias ?? 15),
          );
          const janelaEstorno = new Date(agora);
          janelaEstorno.setDate(
            janelaEstorno.getDate() + (disputa.indicacoes!.campanhas?.janela_estorno_dias ?? 30),
          );
          return {
            status: "aprovada" as IndicacaoStatus,
            prazo_pagamento_em: prazoPagamento.toISOString(),
            janela_estorno_ate: janelaEstorno.toISOString(),
            // A recusa caiu: apagamos o motivo para que a ficha não continue
            // exibindo uma acusação que a plataforma já afastou.
            motivo_recusa: null,
            motivo_recusa_detalhe: null,
            estornada_em: null,
            estorno_motivo: null,
          };
        })()
      : { status: statusAnterior };

  const { data: movidas, error: statusError } = await supabase
    .from("indicacoes")
    .update(patch)
    .eq("id", disputa.indicacao_id)
    .eq("status", "em_disputa")
    .select("id");

  if (statusError || !movidas?.length) {
    return { error: "Não foi possível aplicar a decisão à indicação. Recarregue e tente de novo." };
  }

  const statusFinal = (patch.status as IndicacaoStatus) ?? statusAnterior;

  const { error } = await supabase
    .from("disputas")
    .update({
      decisao,
      decisao_fundamentacao: fundamentacao,
      decidida_em: agora.toISOString(),
    })
    .eq("id", disputaId)
    .is("decidida_em", null);

  if (error) {
    return { error: "A indicação foi atualizada, mas a decisão não gravou. Recarregue a página." };
  }

  await Promise.all([
    supabase.from("indicacao_eventos").insert({
      indicacao_id: disputa.indicacao_id,
      de_status: "em_disputa",
      para_status: statusFinal,
      ator_id: null,
      ator_papel: "admin",
      automatico: false,
      observacao: `Disputa ${decisao}: ${fundamentacao}`,
    }),
    supabase.from("audit_log").insert({
      actor_id: null,
      actor_role: "admin",
      action: "disputa.decidida",
      target_table: "disputas",
      target_id: disputaId,
      metadata: {
        admin_email: adminEmail,
        decisao,
        indicacao_id: disputa.indicacao_id,
        status_final: statusFinal,
        por_silencio_da_empresa: silencioDaEmpresa,
      },
    }),
  ]);

  revalidatePath("/admin/disputas");
  revalidatePath("/empresa/disputas");
  revalidatePath("/app/indicacoes");

  return {
    ok:
      decisao === "procedente"
        ? "Contestação julgada procedente. A indicação voltou a aprovada e o prazo de pagamento reiniciou."
        : `Contestação julgada improcedente. A indicação voltou a ${statusAnterior}.`,
  };
}
