import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Atividade, Regime } from "@/lib/domain/atividades";

/**
 * Leitura de campanhas.
 *
 * Usa sempre o cliente RLS-scoped: o marketplace público lê pela view
 * `campanhas_public` (que só expõe status publicada/pausada) e a área da
 * empresa lê a tabela, onde a policy `empresa gerencia as proprias campanhas`
 * já limita ao tenant. Em nenhum ponto passamos `empresa_id` recebido do
 * cliente para o filtro.
 */

export type CampanhaPublica = {
  id: string;
  slug: string;
  titulo: string;
  produto: string;
  descricao: string;
  segmento_mercado: string;
  atividade_parceiro: Atividade;
  territorio_ufs: string[] | null;
  comissao_cents: number;
  comissao_recorrente: boolean;
  comissao_observacao: string | null;
  ticket_cents: number | null;
  publico_alvo: string;
  resultado_util: string;
  prazo_analise_dias: number;
  prazo_pagamento_dias: number;
  janela_atribuicao_dias: number;
  janela_estorno_dias: number;
  exige_certificacao: boolean;
  status: "publicada" | "pausada";
  publicada_em: string | null;
  regime: Regime;
  empresa_id: string;
  empresa_slug: string;
  empresa_nome: string;
  selo_pendencia_pagamento: boolean;
};

const CAMPOS_PUBLICOS =
  "id, slug, titulo, produto, descricao, segmento_mercado, atividade_parceiro, territorio_ufs, comissao_cents, comissao_recorrente, comissao_observacao, ticket_cents, publico_alvo, resultado_util, prazo_analise_dias, prazo_pagamento_dias, janela_atribuicao_dias, janela_estorno_dias, exige_certificacao, status, publicada_em, regime, empresa_id, empresa_slug, empresa_nome, selo_pendencia_pagamento";

export type FiltrosCampanha = {
  segmento?: string;
  regime?: Regime;
  /** Comissão mínima, em centavos. */
  comissaoMin?: number;
  recorrente?: boolean;
  busca?: string;
};

export async function listarCampanhasPublicas(
  filtros: FiltrosCampanha = {},
): Promise<CampanhaPublica[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("campanhas_public").select(CAMPOS_PUBLICOS);

  if (filtros.segmento) query = query.eq("segmento_mercado", filtros.segmento);
  if (filtros.regime) query = query.eq("regime", filtros.regime);
  if (filtros.comissaoMin !== undefined) query = query.gte("comissao_cents", filtros.comissaoMin);
  if (filtros.recorrente !== undefined) query = query.eq("comissao_recorrente", filtros.recorrente);
  if (filtros.busca) {
    const termo = `%${filtros.busca.replace(/[%_]/g, "")}%`;
    query = query.or(`titulo.ilike.${termo},produto.ilike.${termo},empresa_nome.ilike.${termo}`);
  }

  const { data, error } = await query.order("publicada_em", { ascending: false, nullsFirst: false });
  if (error) return [];
  return (data ?? []) as unknown as CampanhaPublica[];
}

export async function buscarCampanhaPublica(slug: string): Promise<CampanhaPublica | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("campanhas_public")
    .select(CAMPOS_PUBLICOS)
    .eq("slug", slug)
    .maybeSingle();
  return (data as unknown as CampanhaPublica) ?? null;
}

/** Segmentos de mercado que hoje têm campanha no ar — alimenta o filtro. */
export async function listarSegmentosDisponiveis(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("campanhas_public").select("segmento_mercado");
  if (!data) return [];
  return [...new Set(data.map((r) => r.segmento_mercado as string))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

/**
 * A adesão do parceiro logado a esta campanha, se existir. Retorna null para
 * visitante — a policy de `adesoes` já restringe ao próprio parceiro, então
 * não há como esta consulta vazar adesão de terceiro.
 */
export async function minhaAdesao(campanhaId: string): Promise<{
  id: string;
  status: "ativa" | "encerrada";
  certificacao: "nao_exigida" | "pendente" | "aprovada" | "reprovada";
} | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("adesoes")
    .select("id, status, certificacao")
    .eq("campanha_id", campanhaId)
    .eq("parceiro_id", user.id)
    .maybeSingle();

  return (data as { id: string; status: "ativa" | "encerrada"; certificacao: "nao_exigida" | "pendente" | "aprovada" | "reprovada" }) ?? null;
}
