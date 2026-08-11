import type { Metadata } from "next";
import { PageHeader, Card, Pill, EmptyState, AvisoFase0 } from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCents, formatData } from "@/lib/format";

export const metadata: Metadata = { title: "Fatura" };

type Fatura = {
  id: string;
  competencia: string;
  status: "aberta" | "emitida" | "contestada" | "paga" | "vencida";
  assinatura_cents: number;
  total_cents: number;
  emitida_em: string | null;
  vence_em: string | null;
  paga_em: string | null;
  fatura_itens: {
    id: string;
    tipo: "assinatura" | "taxa_indicacao" | "estorno_credito";
    descricao: string;
    valor_cents: number;
    contestado: boolean;
  }[];
};

const STATUS = {
  aberta: { label: "Em aberto", tom: "neutro" },
  emitida: { label: "Emitida", tom: "espera" },
  contestada: { label: "Contestada", tom: "espera" },
  paga: { label: "Paga", tom: "ok" },
  vencida: { label: "Vencida", tom: "erro" },
} as const;

export default async function FaturaPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: faturasData }, { count: faixasCount }] = await Promise.all([
    supabase
      .from("faturas")
      .select(
        "id, competencia, status, assinatura_cents, total_cents, emitida_em, vence_em, paga_em, fatura_itens(id, tipo, descricao, valor_cents, contestado)",
      )
      .order("competencia", { ascending: false })
      .limit(12),
    supabase.from("faixas_taxa").select("id", { count: "exact", head: true }),
  ]);

  const faturas = (faturasData ?? []) as unknown as Fatura[];
  const faixasDefinidas = (faixasCount ?? 0) > 0;

  return (
    <>
      <PageHeader
        titulo="Fatura"
        descricao="O único fluxo financeiro do sistema: a cobrança da plataforma contra você. As comissões dos parceiros não passam por aqui — você paga direto a eles."
      />

      {!faixasDefinidas && (
        <div className="mb-6">
          <AvisoFase0>
            As <strong>faixas de taxa por indicação aprovada ainda não foram definidas</strong>.
            Elas são um dos itens abertos da Fase 0, junto com a revisão dos contratos por
            advogado. Enquanto isso, nenhuma taxa é apurada — indicações aprovadas ficam
            registradas e serão precificadas quando a tabela entrar em vigor, valendo apenas
            daí para frente.
          </AvisoFase0>
        </div>
      )}

      <Card className="mb-6">
        <h2 className="font-medium">Como a cobrança funciona</h2>
        <ul className="mt-3 space-y-2.5 text-sm text-muted">
          <li>
            <strong className="text-foreground">Fato gerador:</strong> indicação aprovada — ato
            seu, registrado com data, hora e usuário. Não cobramos por indicação registrada nem
            por venda fechada.
          </li>
          <li>
            <strong className="text-foreground">Aprovação tácita gera taxa.</strong> Vencido o
            prazo sem manifestação, a indicação é aprovada e a taxa é devida. Avisamos 3 dias
            antes do vencimento.
          </li>
          <li>
            <strong className="text-foreground">Faixa congelada no registro.</strong> Alterar a
            campanha depois não muda a taxa das indicações já registradas.
          </li>
          <li>
            <strong className="text-foreground">Estorno espelhado.</strong> Comissão estornada
            devolve a taxa como crédito na fatura seguinte. Não cobramos por negócio que não se
            realizou.
          </li>
          <li>
            <strong className="text-foreground">Contestação em 10 dias.</strong> Indique o
            lançamento específico: a contestação de boa-fé suspende apenas o valor contestado, o
            restante segue exigível.
          </li>
        </ul>
      </Card>

      {faturas.length === 0 ? (
        <EmptyState
          titulo="Nenhuma fatura emitida"
          descricao="A primeira fatura é emitida no fechamento do mês em que houver assinatura ativa ou indicação aprovada."
        />
      ) : (
        <div className="space-y-4">
          {faturas.map((f) => {
            const st = STATUS[f.status];
            const taxas = f.fatura_itens.filter((i) => i.tipo === "taxa_indicacao");
            const estornos = f.fatura_itens.filter((i) => i.tipo === "estorno_credito");
            return (
              <Card key={f.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        Competência {formatData(f.competencia)}
                      </p>
                      <Pill tom={st.tom}>{st.label}</Pill>
                    </div>
                    <p className="text-xs text-muted mt-1">
                      {f.emitida_em ? `Emitida em ${formatData(f.emitida_em)}` : "Ainda em aberto"}
                      {f.vence_em ? ` · vence em ${formatData(f.vence_em)}` : ""}
                    </p>
                  </div>
                  <p className="text-xl font-semibold">{formatCents(f.total_cents)}</p>
                </div>

                <dl className="mt-4 pt-4 border-t border-border/60 space-y-2 text-sm font-mono">
                  <Linha rotulo="Assinatura" valor={formatCents(f.assinatura_cents)} />
                  <Linha
                    rotulo={`Indicações aprovadas (${taxas.length})`}
                    valor={formatCents(taxas.reduce((s, i) => s + i.valor_cents, 0))}
                  />
                  {estornos.length > 0 && (
                    <Linha
                      rotulo={`Estornos do período (${estornos.length})`}
                      valor={formatCents(estornos.reduce((s, i) => s + i.valor_cents, 0))}
                    />
                  )}
                  <div className="flex justify-between pt-2 border-t border-border/60">
                    <span>Total</span>
                    <span className="font-semibold">{formatCents(f.total_cents)}</span>
                  </div>
                </dl>

                {f.fatura_itens.length > 0 && (
                  <details className="mt-4">
                    <summary className="text-sm text-muted cursor-pointer hover:text-foreground">
                      Ver extrato item a item ({f.fatura_itens.length})
                    </summary>
                    <ul className="mt-3 divide-y divide-border/60">
                      {f.fatura_itens.map((item) => (
                        <li key={item.id} className="py-2 flex justify-between gap-3 text-sm">
                          <span className="text-muted min-w-0 truncate">
                            {item.descricao}
                            {item.contestado && (
                              <span className="ml-2 text-xs text-espera">contestado</span>
                            )}
                          </span>
                          <span className="shrink-0 font-mono">{formatCents(item.valor_cents)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3 text-muted">
      <dt>{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  );
}
