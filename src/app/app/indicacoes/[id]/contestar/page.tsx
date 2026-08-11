import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireParceiro } from "@/lib/auth/session";
import { PageHeader, Card, Campo, EmptyState, BotaoLink } from "@/components/ui";
import { formatCents, formatData, formatDataHora } from "@/lib/format";
import { MOTIVO_RECUSA_INFO, PRAZOS_FIXOS, type MotivoRecusa } from "@/lib/domain/indicacoes";
import { ContestarForm } from "./contestar-form";

export const metadata: Metadata = { title: "Contestar decisão" };

type Indicacao = {
  id: string;
  status: string;
  lead_empresa_nome: string;
  comissao_cents: number;
  registrada_em: string;
  analisada_em: string | null;
  estornada_em: string | null;
  estorno_motivo: string | null;
  motivo_recusa: MotivoRecusa | null;
  motivo_recusa_detalhe: string | null;
  campanhas: { titulo: string } | null;
  empresas: { nome_fantasia: string } | null;
};

export default async function ContestarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await requireParceiro();
  const supabase = await createSupabaseServerClient();

  // A policy `parceiro le as proprias indicacoes` já limita o alcance deste
  // select; o filtro por parceiro_id é redundância explícita, não a defesa.
  const { data } = await supabase
    .from("indicacoes")
    .select(
      "id, status, lead_empresa_nome, comissao_cents, registrada_em, analisada_em, estornada_em, estorno_motivo, motivo_recusa, motivo_recusa_detalhe, campanhas(titulo), empresas(nome_fantasia)",
    )
    .eq("id", id)
    .eq("parceiro_id", sessao.userId)
    .maybeSingle();

  const indicacao = data as unknown as Indicacao | null;
  if (!indicacao) notFound();

  const contestavel = indicacao.status === "recusada" || indicacao.status === "estornada";
  const estorno = indicacao.status === "estornada";
  const referencia = indicacao.estornada_em ?? indicacao.analisada_em;

  const prazoLimite = referencia ? new Date(referencia) : null;
  if (prazoLimite) prazoLimite.setDate(prazoLimite.getDate() + PRAZOS_FIXOS.contestacaoParceiroDias);
  const vencido = prazoLimite ? new Date() > prazoLimite : false;

  return (
    <>
      <Link href="/app/indicacoes" className="text-sm text-muted hover:text-foreground">
        ← Minhas indicações
      </Link>

      <div className="mt-6">
        <PageHeader
          titulo={estorno ? "Contestar estorno" : "Contestar recusa"}
          descricao="Contestação registrada abre uma disputa. Ela fica visível para a empresa e para a plataforma, com prazo correndo para os dois lados."
        />
      </div>

      <Card className="mb-6">
        <dl>
          <Campo label="Lead">{indicacao.lead_empresa_nome}</Campo>
          <Campo label="Campanha">
            {indicacao.campanhas?.titulo ?? "—"}
            {indicacao.empresas?.nome_fantasia ? ` · ${indicacao.empresas.nome_fantasia}` : ""}
          </Campo>
          <Campo label="Comissão em disputa">{formatCents(indicacao.comissao_cents)}</Campo>
          <Campo label="Registrada em">{formatDataHora(indicacao.registrada_em)}</Campo>
          <Campo label={estorno ? "Estornada em" : "Decisão da empresa em"}>
            {formatDataHora(referencia)}
          </Campo>
          <Campo label={estorno ? "Motivo do estorno" : "Motivo da recusa"}>
            {estorno ? (
              (indicacao.estorno_motivo ?? "—")
            ) : indicacao.motivo_recusa ? (
              <>
                <strong>{MOTIVO_RECUSA_INFO[indicacao.motivo_recusa].label}</strong>
                {indicacao.motivo_recusa_detalhe ? ` — ${indicacao.motivo_recusa_detalhe}` : ""}
                <span className="block text-xs text-muted mt-1.5">
                  Prova exigida da empresa: {MOTIVO_RECUSA_INFO[indicacao.motivo_recusa].prova}
                </span>
              </>
            ) : (
              "—"
            )}
          </Campo>
        </dl>
      </Card>

      {!contestavel ? (
        <EmptyState
          titulo="Esta indicação não está em fase de contestação"
          descricao={
            indicacao.status === "em_disputa"
              ? "A contestação já foi aberta e está correndo. Acompanhe pela lista de indicações."
              : "Só recusa ou estorno podem ser contestados."
          }
          acao={
            <BotaoLink href="/app/indicacoes" variante="secundario" tamanho="sm">
              Voltar às indicações
            </BotaoLink>
          }
        />
      ) : vencido ? (
        <EmptyState
          titulo="O prazo de contestação venceu"
          descricao={`Você tinha ${PRAZOS_FIXOS.contestacaoParceiroDias} dias a partir de ${formatData(referencia)}. O vencimento fecha este canal, mas não extingue a dívida: a cobrança pelas vias próprias continua disponível, e você pode pedir o conjunto probatório pelo canal de contato.`}
          acao={
            <BotaoLink href="/app/indicacoes" variante="secundario" tamanho="sm">
              Voltar às indicações
            </BotaoLink>
          }
        />
      ) : (
        <Card>
          <p className="text-sm text-muted mb-4">
            Prazo para contestar: até <strong className="text-foreground">{formatData(prazoLimite)}</strong>.
          </p>
          <ContestarForm indicacaoId={indicacao.id} />
        </Card>
      )}
    </>
  );
}
