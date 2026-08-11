import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Resolução da faixa de taxa vigente para uma comissão.
 *
 * Retorna `{ faixaId: null, taxaCents: null }` enquanto a tabela de faixas
 * estiver vazia — e ela está, porque definir os valores é item aberto da
 * Fase 0 (ver `docs/ROADMAP.md`). Isso é deliberado: uma indicação aprovada
 * sem faixa fica registrada e visível como pendente de precificação, em vez
 * de gerar cobrança com número inventado.
 *
 * Quando as faixas entrarem em vigor, elas valem para indicações registradas
 * a partir da vigência — a faixa é congelada no registro (convenção 2), então
 * o histórico não é reprecificado retroativamente.
 */
export async function faixaEValorDaTaxa(comissaoCents: number): Promise<{
  faixaId: string | null;
  taxaCents: number | null;
}> {
  const supabase = await createSupabaseServerClient();
  const hoje = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("faixas_taxa")
    .select("id, taxa_cents, comissao_min_cents, comissao_max_cents")
    .lte("comissao_min_cents", comissaoCents)
    .lte("vigente_desde", hoje)
    .or(`vigente_ate.is.null,vigente_ate.gte.${hoje}`)
    .order("comissao_min_cents", { ascending: false });

  const faixa = (data ?? []).find(
    (f) =>
      f.comissao_max_cents === null || comissaoCents <= (f.comissao_max_cents as number),
  );

  if (!faixa) return { faixaId: null, taxaCents: null };
  return { faixaId: faixa.id as string, taxaCents: faixa.taxa_cents as number };
}
