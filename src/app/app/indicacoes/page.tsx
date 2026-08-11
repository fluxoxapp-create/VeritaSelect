import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader, Card, Pill, EmptyState, BotaoLink } from "@/components/ui";
import { listarMinhasIndicacoes } from "@/lib/data/indicacoes";
import { formatCents, formatData, formatPrazo } from "@/lib/format";
import {
  STATUS_INFO,
  INDICACAO_STATUS,
  MOTIVO_RECUSA_INFO,
  PRAZOS_FIXOS,
  type IndicacaoStatus,
} from "@/lib/domain/indicacoes";

export const metadata: Metadata = { title: "Minhas indicações" };

export default async function IndicacoesParceiro({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = (INDICACAO_STATUS as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as IndicacaoStatus)
    : undefined;

  const indicacoes = await listarMinhasIndicacoes({ status });

  return (
    <>
      <PageHeader
        titulo="Minhas indicações"
        descricao="Registre o cliente antes do primeiro contato dele com a empresa. O carimbo de tempo do registro é a prova da atribuição."
        acao={<BotaoLink href="/app/indicacoes/nova">Registrar indicação</BotaoLink>}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <FiltroStatus atual={status} valor={undefined} label="Todas" />
        {INDICACAO_STATUS.map((s) => (
          <FiltroStatus key={s} atual={status} valor={s} label={STATUS_INFO[s].label} />
        ))}
      </div>

      {indicacoes.length === 0 ? (
        <EmptyState
          titulo={status ? `Nenhuma indicação ${STATUS_INFO[status].label.toLowerCase()}` : "Nenhuma indicação ainda"}
          descricao={
            status
              ? "Troque o filtro para ver as demais."
              : "Adira a uma campanha e registre o primeiro cliente. Você acompanha aqui cada mudança de status, com data e responsável."
          }
          acao={<BotaoLink href="/campanhas" variante="secundario" tamanho="sm">Ver campanhas</BotaoLink>}
        />
      ) : (
        <div className="space-y-4">
          {indicacoes.map((i) => {
            const info = STATUS_INFO[i.status];
            return (
              <Card key={i.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{i.lead_empresa_nome}</p>
                      <Pill tom={info.tom} title={info.significado}>
                        {info.label}
                      </Pill>
                      {i.aprovacao_tacita && (
                        <Pill tom="ok" title="A empresa não se manifestou dentro do prazo — a indicação foi aprovada por decurso de prazo.">
                          Aprovação tácita
                        </Pill>
                      )}
                    </div>
                    <p className="text-sm text-muted mt-1">
                      {i.campanhas?.titulo ?? "—"} · contato: {i.lead_contato_nome}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      Registrada em {formatData(i.registrada_em)}
                      {" · "}
                      janela de atribuição até {formatData(i.janela_atribuicao_ate)}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-lg font-semibold text-gold-soft">
                      {formatCents(i.comissao_cents)}
                      {i.campanhas?.comissao_recorrente && (
                        <span className="text-sm text-muted">/mês</span>
                      )}
                    </p>
                    {(i.status === "registrada" || i.status === "em_analise") && (
                      <p className="text-xs text-muted mt-1">
                        análise {formatPrazo(i.prazo_analise_em)}
                      </p>
                    )}
                    {i.status === "aprovada" && i.prazo_pagamento_em && (
                      <p className="text-xs text-espera mt-1">
                        pagamento {formatPrazo(i.prazo_pagamento_em)}
                      </p>
                    )}
                    {i.status === "paga" && (
                      <p className="text-xs text-ok mt-1">paga em {formatData(i.paga_em)}</p>
                    )}
                  </div>
                </div>

                {i.status === "recusada" && i.motivo_recusa && (
                  <div className="mt-4 rounded-lg border border-erro/40 bg-erro/5 p-4">
                    <p className="text-sm font-medium text-erro">
                      Recusada: {MOTIVO_RECUSA_INFO[i.motivo_recusa].label}
                    </p>
                    {i.motivo_recusa_detalhe && (
                      <p className="text-sm text-muted mt-1.5">{i.motivo_recusa_detalhe}</p>
                    )}
                    <p className="text-xs text-muted mt-2">
                      A empresa precisa sustentar isso com prova: {MOTIVO_RECUSA_INFO[i.motivo_recusa].prova}
                    </p>
                    <p className="text-xs text-muted mt-2">
                      Você tem {PRAZOS_FIXOS.contestacaoParceiroDias} dias a partir de{" "}
                      {formatData(i.analisada_em)} para contestar. Se a empresa não responder em{" "}
                      {PRAZOS_FIXOS.respostaEmpresaDias} dias, a contestação é considerada
                      procedente.
                    </p>
                    <div className="mt-3">
                      <BotaoLink href={`/app/indicacoes/${i.id}/contestar`} variante="secundario" tamanho="sm">
                        Contestar recusa
                      </BotaoLink>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function FiltroStatus({
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
      href={valor ? `/app/indicacoes?status=${valor}` : "/app/indicacoes"}
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
