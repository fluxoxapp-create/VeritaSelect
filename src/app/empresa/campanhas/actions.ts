"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireEmpresa } from "@/lib/auth/session";
import { parseCents } from "@/lib/format";
import { isAtividade, regimeDaAtividade, conselhoDaAtividade, MOTIVO_SEGMENTO_FECHADO } from "@/lib/domain/atividades";
import { PRAZOS, prazoValido, type PrazoChave } from "@/lib/domain/indicacoes";

type FormState = { error?: string; redirectTo?: string } | undefined;

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function lerPrazo(formData: FormData, campo: string, chave: PrazoChave): number | null {
  const bruto = formData.get(campo);
  const valor = bruto === null || bruto === "" ? PRAZOS[chave].padrao : Number(bruto);
  return prazoValido(chave, valor) ? valor : null;
}

/**
 * Criação de campanha.
 *
 * Três validações aqui existem também no banco, e é assim de propósito — o
 * formulário não é controle de segurança (convenção técnica 7). O que esta
 * camada acrescenta é a mensagem de erro decente antes de a pessoa perder o
 * formulário preenchido:
 *   1. segmento fechado nunca publica (CHECK `campanha_segmento_fechado_nunca_publica`);
 *   2. prazos dentro dos limites da política 06 §10 (CHECKs de cada coluna);
 *   3. campanha de CRECI precisa declarar território (CHECK `campanha_regulada_exige_territorio`).
 */
export async function criarCampanha(_prev: FormState, formData: FormData): Promise<FormState> {
  const sessao = await requireEmpresa();

  const titulo = String(formData.get("titulo") ?? "").trim();
  const produto = String(formData.get("produto") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const segmentoMercado = String(formData.get("segmentoMercado") ?? "").trim();
  const atividade = String(formData.get("atividadeParceiro") ?? "");
  const publicoAlvo = String(formData.get("publicoAlvo") ?? "").trim();
  const resultadoUtil = String(formData.get("resultadoUtil") ?? "").trim();
  const comissaoRecorrente = formData.get("comissaoRecorrente") === "on";
  const comissaoObservacao = String(formData.get("comissaoObservacao") ?? "").trim();
  const publicar = formData.get("publicar") === "on";
  const territorio = formData.getAll("territorioUfs").map(String).filter((uf) => UFS.includes(uf));

  if (!titulo || !produto || !segmentoMercado || !publicoAlvo || !resultadoUtil) {
    return { error: "Preencha todos os campos obrigatórios." };
  }
  if (!isAtividade(atividade)) {
    return { error: "Escolha o que o parceiro faz nesta campanha." };
  }

  const regime = regimeDaAtividade(atividade);
  if (regime === "fechado") {
    return {
      error:
        MOTIVO_SEGMENTO_FECHADO[atividade] ??
        "Este segmento não pode receber campanhas na plataforma.",
    };
  }
  if (regime === "habilitacao" && conselhoDaAtividade(atividade) === "creci" && territorio.length === 0) {
    return {
      error:
        "Campanha de intermediação imobiliária precisa declarar as UFs de atuação — o CRECI é estadual e a inscrição do parceiro é cruzada com esse território.",
    };
  }

  const comissaoCents = parseCents(String(formData.get("comissao") ?? ""));
  if (comissaoCents === null || comissaoCents <= 0) {
    return { error: "Informe a comissão em reais, por exemplo 300,00." };
  }
  const ticketBruto = String(formData.get("ticket") ?? "").trim();
  const ticketCents = ticketBruto ? parseCents(ticketBruto) : null;
  if (ticketBruto && (ticketCents === null || ticketCents <= 0)) {
    return { error: "Ticket inválido. Use o formato 1.290,00." };
  }

  const prazoAnalise = lerPrazo(formData, "prazoAnaliseDias", "analise");
  const prazoPagamento = lerPrazo(formData, "prazoPagamentoDias", "pagamento");
  const janelaAtribuicao = lerPrazo(formData, "janelaAtribuicaoDias", "atribuicao");
  const janelaEstorno = lerPrazo(formData, "janelaEstornoDias", "estorno");

  if (prazoAnalise === null) return { error: prazoForaDoLimite("analise") };
  if (prazoPagamento === null) return { error: prazoForaDoLimite("pagamento") };
  if (janelaAtribuicao === null) return { error: prazoForaDoLimite("atribuicao") };
  if (janelaEstorno === null) return { error: prazoForaDoLimite("estorno") };

  // Publicar exige empresa verificada: a campanha vira endosso público, e
  // endosso sem KYB é responsabilidade que não temos como sustentar.
  if (publicar && sessao.empresa.kybStatus !== "aprovada") {
    return {
      error:
        "A verificação da sua empresa ainda não foi aprovada. Salve como rascunho — a publicação libera quando ela for concluída.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const slug = `${slugify(titulo)}-${Math.random().toString(36).slice(2, 7)}`;

  const { data, error } = await supabase
    .from("campanhas")
    .insert({
      empresa_id: sessao.empresa.id,
      slug,
      titulo,
      produto,
      descricao,
      segmento_mercado: segmentoMercado,
      atividade_parceiro: atividade,
      territorio_ufs: territorio.length ? territorio : null,
      comissao_cents: comissaoCents,
      comissao_recorrente: comissaoRecorrente,
      comissao_observacao: comissaoObservacao || null,
      ticket_cents: ticketCents,
      publico_alvo: publicoAlvo,
      resultado_util: resultadoUtil,
      prazo_analise_dias: prazoAnalise,
      prazo_pagamento_dias: prazoPagamento,
      janela_atribuicao_dias: janelaAtribuicao,
      janela_estorno_dias: janelaEstorno,
      status: publicar ? "publicada" : "rascunho",
      publicada_em: publicar ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Não foi possível salvar a campanha agora. Tente novamente." };
  }

  const admin = createSupabaseAdminClient();
  await admin.from("audit_log").insert({
    actor_id: sessao.userId,
    actor_role: "empresa",
    action: publicar ? "campanha.publicada" : "campanha.criada",
    target_table: "campanhas",
    target_id: data.id,
    metadata: { titulo, atividade_parceiro: atividade, regime, comissao_cents: comissaoCents },
  });

  revalidatePath("/empresa/campanhas");
  revalidatePath("/campanhas");
  return { redirectTo: "/empresa/campanhas" };
}

function prazoForaDoLimite(chave: PrazoChave): string {
  const p = PRAZOS[chave];
  return `${p.label} precisa ficar entre ${p.min} e ${p.max} dias — limite da política de comissionamento.`;
}
