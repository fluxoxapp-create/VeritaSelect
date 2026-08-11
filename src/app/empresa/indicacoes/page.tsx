import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader, Card, Pill, EmptyState, BotaoLink } from "@/components/ui";
import { listarIndicacoesRecebidas } from "@/lib/data/indicacoes";
import { formatCents, formatData, formatPrazo, diasAte } from "@/lib/format";
import {
  STATUS_INFO,
  INDICACAO_STATUS,
  MOTIVO_RECUSA_INFO,
  PRAZOS_FIXOS,
  type IndicacaoStatus,
} from "@/lib/domain/indicacoes";
import { AnaliseForm, LiquidacaoForm } from "./analise-form";

export const metadata: Metadata = { title: "Fila de aprovação" };

export default async function IndicacoesEmpresa({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = (INDICACAO_STATUS as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as IndicacaoStatus)
    : undefined;

  const indicacoes = await listarIndicacoesRecebidas({ status });

  return (
    <>
      <PageHeader
        titulo="Fila de aprovação"
        descricao="Aprove ou recuse dentro do prazo. Vencido o prazo sem manifestação, a indicação é aprovada automaticamente e gera comissão e taxa."
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <Filtro atual={status} valor={undefined} label="Todas" />
        {INDICACAO_STATUS.map((s) => (
          <Filtro key={s} atual={status} valor={s} label={STATUS_INFO[s].label} />
        ))}
      </div>

      {indicacoes.length === 0 ? (
        <EmptyState
          titulo={status ? "Nenhuma indicação com esse status" : "Nenhuma indicação recebida"}
          descricao={
            status
              ? "Troque o filtro para ver as demais."
              : "Publique uma campanha para que parceiros possam aderir e registrar indicações."
          }
          acao={<BotaoLink href="/empresa/campanhas/nova" variante="secundario" tamanho="sm">Criar campanha</BotaoLink>}
        />
      ) : (
        <div className="space-y-4">
          {indicacoes.map((i) => {
            const info = STATUS_INFO[i.status];
            const emAnalise = i.status === "registrada" || i.status === "em_analise";
            const dias = diasAte(i.prazo_analise_em);
            const urgente = emAnalise && dias !== null && dias <= PRAZOS_FIXOS.avisoAntesDoVencimentoDias;

            return (
              <Card key={i.id} className={urgente ? "border-espera/50" : ""}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{i.lead_empresa_nome}</p>
                      <Pill tom={info.tom} title={info.significado}>
                        {info.label}
                      </Pill>
                      {i.aprovacao_tacita && (
                        <Pill tom="espera" title="Aprovada por decurso de prazo — gera comissão e taxa como uma aprovação expressa.">
                          Aprovação tácita
                        </Pill>
                      )}
                    </div>
                    <p className="text-sm text-muted mt-1">
                      {i.campanhas?.titulo ?? "—"} · contato: {i.lead_contato_nome}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      Registrada em {formatData(i.registrada_em)}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted">Comissão ao parceiro</p>
                    <p className="text-lg font-semibold">{formatCents(i.comissao_cents)}</p>
                    {emAnalise && (
                      <p className={`text-xs mt-1 ${urgente ? "text-espera" : "text-muted"}`}>
                        análise {formatPrazo(i.prazo_analise_em)}
                      </p>
                    )}
                    {i.status === "aprovada" && i.prazo_pagamento_em && (
                      <p className="text-xs text-espera mt-1">
                        pagar {formatPrazo(i.prazo_pagamento_em)}
                      </p>
                    )}
                  </div>
                </div>

                {urgente && (
                  <p className="mt-3 text-xs text-espera">
                    Faltam {dias} {dias === 1 ? "dia" : "dias"} para a aprovação tácita. Sem sua
                    manifestação, esta indicação será aprovada automaticamente.
                  </p>
                )}

                {i.status === "recusada" && i.motivo_recusa && (
                  <div className="mt-4 pt-4 border-t border-border/60">
                    <p className="text-sm text-muted">
                      Recusada por{" "}
                      <strong className="text-foreground">
                        {MOTIVO_RECUSA_INFO[i.motivo_recusa].label}
                      </strong>
                      {i.motivo_recusa_detalhe ? ` — ${i.motivo_recusa_detalhe}` : ""}
                    </p>
                    <p className="text-xs text-muted mt-1.5">
                      O parceiro tem {PRAZOS_FIXOS.contestacaoParceiroDias} dias para contestar. Se
                      você não responder em {PRAZOS_FIXOS.respostaEmpresaDias} dias, a contestação
                      é considerada procedente.
                    </p>
                  </div>
                )}

                {emAnalise && <AnaliseForm indicacaoId={i.id} />}
                {i.status === "aprovada" && <LiquidacaoForm indicacaoId={i.id} />}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function Filtro({
  atual,
  valor,
  label,
}: {
  atual: IndicacaoStatus | undefined;
  valor: IndicacaoStatus | undefined;
  label: string;
}) {
  const ativo = atual === valor;
  return (
    <Link
      href={valor ? `/empresa/indicacoes?status=${valor}` : "/empresa/indicacoes"}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        ativo
          ? "border-gold/50 bg-gold/10 text-gold-soft"
          : "border-border text-muted hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
