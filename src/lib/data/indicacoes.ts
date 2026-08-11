import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { IndicacaoStatus, MotivoRecusa } from "@/lib/domain/indicacoes";

/**
 * Leitura de indicações.
 *
 * Nenhuma função aqui recebe `empresaId` ou `parceiroId` por parâmetro: o
 * escopo vem das policies de RLS sobre `auth.uid()` (`parceiro le as
 * proprias indicacoes` / `empresa le indicacoes recebidas`). Passar o dono
 * como argumento abriria a porta para um IDOR à primeira distração.
 */

export type IndicacaoLinha = {
  id: string;
  status: IndicacaoStatus;
  lead_empresa_nome: string;
  lead_contato_nome: string;
  comissao_cents: number;
  taxa_cents: number | null;
  registrada_em: string;
  prazo_analise_em: string;
  prazo_pagamento_em: string | null;
  janela_atribuicao_ate: string;
  aprovacao_tacita: boolean;
  motivo_recusa: MotivoRecusa | null;
  motivo_recusa_detalhe: string | null;
  analisada_em: string | null;
  paga_em: string | null;
  campanhas: { titulo: string; slug: string; comissao_recorrente: boolean } | null;
};

const CAMPOS =
  "id, status, lead_empresa_nome, lead_contato_nome, comissao_cents, taxa_cents, registrada_em, prazo_analise_em, prazo_pagamento_em, janela_atribuicao_ate, aprovacao_tacita, motivo_recusa, motivo_recusa_detalhe, analisada_em, paga_em, campanhas(titulo, slug, comissao_recorrente)";

/** Indicações do parceiro logado. */
export async function listarMinhasIndicacoes(
  filtro?: { status?: IndicacaoStatus },
): Promise<IndicacaoLinha[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("indicacoes")
    .select(CAMPOS)
    .eq("parceiro_id", user.id)
    .order("registrada_em", { ascending: false });

  if (filtro?.status) query = query.eq("status", filtro.status);

  const { data } = await query;
  return (data ?? []) as unknown as IndicacaoLinha[];
}

/** Indicações recebidas pela empresa do usuário logado. */
export async function listarIndicacoesRecebidas(
  filtro?: { status?: IndicacaoStatus },
): Promise<(IndicacaoLinha & { parceiro_id: string })[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("indicacoes")
    .select(`${CAMPOS}, parceiro_id`)
    // Sem `.eq("empresa_id", ...)`: a policy já limita ao tenant da sessão.
    .order("prazo_analise_em", { ascending: true });

  if (filtro?.status) query = query.eq("status", filtro.status);

  const { data } = await query;
  return (data ?? []) as unknown as (IndicacaoLinha & { parceiro_id: string })[];
}

export type ResumoStatus = Record<IndicacaoStatus, number>;

const RESUMO_VAZIO: ResumoStatus = {
  registrada: 0,
  em_analise: 0,
  aprovada: 0,
  paga: 0,
  recusada: 0,
  em_disputa: 0,
  estornada: 0,
  expirada: 0,
};

/**
 * Contagem por status para os cartões do painel. Uma query só, agregada em
 * memória — o volume por usuário é baixo e evita seis round-trips.
 */
export async function resumoPorStatus(escopo: "parceiro" | "empresa"): Promise<ResumoStatus> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ...RESUMO_VAZIO };

  let query = supabase.from("indicacoes").select("status");
  if (escopo === "parceiro") query = query.eq("parceiro_id", user.id);

  const { data } = await query;
  const resumo = { ...RESUMO_VAZIO };
  for (const linha of data ?? []) {
    const s = linha.status as IndicacaoStatus;
    if (s in resumo) resumo[s] += 1;
  }
  return resumo;
}

/** Soma das comissões do parceiro em um conjunto de status. */
export async function somarComissoes(statuses: IndicacaoStatus[]): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data } = await supabase
    .from("indicacoes")
    .select("comissao_cents")
    .eq("parceiro_id", user.id)
    .in("status", statuses);

  return (data ?? []).reduce((soma, l) => soma + (l.comissao_cents as number), 0);
}
