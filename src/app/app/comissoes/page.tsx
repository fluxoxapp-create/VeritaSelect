import type { Metadata } from "next";
import { PageHeader, Card, Stat, Pill, EmptyState, BotaoLink } from "@/components/ui";
import { listarMinhasIndicacoes, somarComissoes } from "@/lib/data/indicacoes";
import { formatCents, formatData, formatPrazo } from "@/lib/format";
import { ESCALA_INADIMPLENCIA, PRAZOS_FIXOS } from "@/lib/domain/indicacoes";

export const metadata: Metadata = { title: "Comissões" };

export default async function ComissoesPage() {
  const [aReceber, recebido, estornado, indicacoes] = await Promise.all([
    somarComissoes(["aprovada"]),
    somarComissoes(["paga"]),
    somarComissoes(["estornada"]),
    listarMinhasIndicacoes(),
  ]);

  const aguardando = indicacoes.filter((i) => i.status === "aprovada");
  const pagas = indicacoes.filter((i) => i.status === "paga");
  const atrasadas = aguardando.filter(
    (i) => i.prazo_pagamento_em && new Date(i.prazo_pagamento_em) < new Date(),
  );

  return (
    <>
      <PageHeader
        titulo="Comissões"
        descricao="Quem paga é a empresa, direto na sua chave Pix. A plataforma não custodia, não intermedia e não repassa nada — e não desconta nada de você."
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Stat label="A receber" valor={formatCents(aReceber)} detalhe={`${aguardando.length} aprovadas`} tom="espera" />
        <Stat label="Recebido" valor={formatCents(recebido)} detalhe={`${pagas.length} liquidadas`} tom="ok" />
        <Stat label="Estornado" valor={formatCents(estornado)} detalhe="devolvido com prova" tom={estornado > 0 ? "erro" : undefined} />
      </div>

      {atrasadas.length > 0 && (
        <Card className="mb-8 border-erro/40">
          <p className="font-medium text-erro">
            {atrasadas.length} {atrasadas.length === 1 ? "comissão está atrasada" : "comissões estão atrasadas"}
          </p>
          <p className="text-sm text-muted mt-2">
            O prazo de pagamento venceu e a empresa não registrou a liquidação. Isso aciona
            automaticamente a escala de sanção — você não precisa fazer nada para que ela corra.
          </p>
          <ol className="mt-4 space-y-1.5 text-sm text-muted">
            {ESCALA_INADIMPLENCIA.map((e) => (
              <li key={e.dias} className="flex gap-3">
                <span className="font-mono text-xs text-espera w-16 shrink-0">
                  {e.dias} {e.dias === 1 ? "dia" : "dias"}
                </span>
                <span>{e.consequencia}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted mt-4">
            Precisando cobrar judicialmente, a plataforma fornece o conjunto probatório: contrato
            de campanha assinado, log de registro, aprovação e comunicações.
          </p>
        </Card>
      )}

      <Card className="mb-6">
        <h2 className="font-medium">Aguardando pagamento</h2>
        <p className="text-sm text-muted mt-1">
          A empresa tem o prazo da campanha para pagar, mais{" "}
          {PRAZOS_FIXOS.registroLiquidacaoDiasUteis} dias úteis para registrar a liquidação aqui.
          Não recebeu o que está marcado como pago? Você tem {PRAZOS_FIXOS.contestacaoParceiroDias}{" "}
          dias para contestar.
        </p>
        {aguardando.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              titulo="Nada aguardando"
              descricao="Assim que uma indicação for aprovada, ela aparece aqui com o prazo de pagamento correndo."
              acao={<BotaoLink href="/campanhas" variante="secundario" tamanho="sm">Ver campanhas</BotaoLink>}
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border/60">
            {aguardando.map((i) => (
              <li key={i.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{i.lead_empresa_nome}</p>
                  <p className="text-xs text-muted truncate">{i.campanhas?.titulo ?? "—"}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs text-muted">
                    {i.prazo_pagamento_em ? `vence ${formatPrazo(i.prazo_pagamento_em)}` : "—"}
                  </span>
                  <span className="text-sm font-medium">{formatCents(i.comissao_cents)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="font-medium">Histórico de recebimentos</h2>
        {pagas.length === 0 ? (
          <p className="text-sm text-muted mt-3">Nenhuma liquidação registrada ainda.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border/60">
            {pagas.map((i) => (
              <li key={i.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm truncate">{i.lead_empresa_nome}</p>
                  <p className="text-xs text-muted truncate">{i.campanhas?.titulo ?? "—"}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs text-muted">{formatData(i.paga_em)}</span>
                  <Pill tom="ok">{formatCents(i.comissao_cents)}</Pill>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
