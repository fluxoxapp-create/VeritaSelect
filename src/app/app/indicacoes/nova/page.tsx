import type { Metadata } from "next";
import { PageHeader, EmptyState, BotaoLink } from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { IndicacaoForm, type OpcaoCampanha } from "./indicacao-form";

export const metadata: Metadata = { title: "Registrar indicação" };

type Adesao = {
  id: string;
  certificacao: "nao_exigida" | "pendente" | "aprovada" | "reprovada";
  campanhas: {
    titulo: string;
    status: string;
    comissao_cents: number;
    comissao_recorrente: boolean;
    resultado_util: string;
    prazo_analise_dias: number;
    janela_atribuicao_dias: number;
  } | null;
};

export default async function NovaIndicacao() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("adesoes")
    .select(
      "id, certificacao, campanhas(titulo, status, comissao_cents, comissao_recorrente, resultado_util, prazo_analise_dias, janela_atribuicao_dias)",
    )
    .eq("status", "ativa");

  const opcoes: OpcaoCampanha[] = ((data ?? []) as unknown as Adesao[])
    .filter((a) => a.campanhas?.status === "publicada" && a.certificacao !== "pendente")
    .map((a) => ({
      adesaoId: a.id,
      titulo: a.campanhas!.titulo,
      comissaoCents: a.campanhas!.comissao_cents,
      recorrente: a.campanhas!.comissao_recorrente,
      resultadoUtil: a.campanhas!.resultado_util,
      prazoAnaliseDias: a.campanhas!.prazo_analise_dias,
      janelaAtribuicaoDias: a.campanhas!.janela_atribuicao_dias,
    }));

  return (
    <>
      <PageHeader
        titulo="Registrar indicação"
        descricao="O registro gera o carimbo de tempo que prova a atribuição. Faça isso antes do primeiro contato do lead com a empresa."
      />

      {opcoes.length === 0 ? (
        <EmptyState
          titulo="Nenhuma campanha disponível para indicar"
          descricao="Você precisa de uma adesão ativa a uma campanha publicada. Se houver certificação de produto pendente, conclua antes."
          acao={<BotaoLink href="/campanhas" variante="secundario" tamanho="sm">Ver campanhas</BotaoLink>}
        />
      ) : (
        <IndicacaoForm opcoes={opcoes} />
      )}
    </>
  );
}
