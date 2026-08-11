import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Card, Pill, EmptyState } from "@/components/ui";
import { formatDataHora, formatPrazo, formatCents } from "@/lib/format";
import { DecisaoForm } from "./decisao-form";

export const metadata = { title: "Disputas" };

type Disputa = {
  id: string;
  motivo: string;
  aberta_em: string;
  prazo_resposta_em: string;
  prazo_decisao_em: string | null;
  resposta_empresa: string | null;
  respondida_em: string | null;
  decisao: "procedente" | "improcedente" | null;
  decisao_fundamentacao: string | null;
  decidida_em: string | null;
  indicacoes: {
    lead_empresa_nome: string;
    comissao_cents: number;
    status: string;
    motivo_recusa: string | null;
    motivo_recusa_detalhe: string | null;
    registrada_em: string;
    registrada_ip: string | null;
  } | null;
};

export default async function AdminDisputas() {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("disputas")
    .select(
      "id, motivo, aberta_em, prazo_resposta_em, prazo_decisao_em, resposta_empresa, respondida_em, decisao, decisao_fundamentacao, decidida_em, indicacoes(lead_empresa_nome, comissao_cents, status, motivo_recusa, motivo_recusa_detalhe, registrada_em, registrada_ip)",
    )
    .order("aberta_em", { ascending: true });

  const disputas = (data ?? []) as unknown as Disputa[];
  const abertas = disputas.filter((d) => !d.decidida_em);
  const decididas = disputas.filter((d) => d.decidida_em);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <Link href="/admin" className="text-sm text-muted hover:text-foreground">
        ← Painel admin
      </Link>

      <div className="mt-6">
        <PageHeader
          titulo="Disputas"
          descricao="Decisão administrativa e não vinculante — nenhuma das partes renuncia ao acesso ao Judiciário. Prazo: 10 dias úteis."
        />
      </div>

      <Card className="mb-6">
        <p className="font-medium text-sm">Ordem de peso das provas</p>
        <ol className="mt-3 space-y-1.5 text-sm text-muted list-decimal list-inside">
          <li>
            <strong className="text-foreground">Logs da plataforma</strong> (registro, timestamp,
            IP) — prova mais forte
          </li>
          <li>Documentos datados anexados pelas partes</li>
          <li>Termos publicados da campanha no momento da adesão</li>
          <li>Histórico de conduta das partes na plataforma</li>
        </ol>
        <p className="text-xs text-muted mt-3">
          O silêncio da empresa por 5 dias implica procedência da contestação.
        </p>
      </Card>

      {abertas.length === 0 ? (
        <EmptyState
          titulo="Nenhuma disputa aberta"
          descricao="Contestações de recusa ou de estorno aparecem aqui, com o prazo de decisão correndo."
        />
      ) : (
        <div className="space-y-4">
          {abertas.map((d) => {
            // §7: sem resposta e com prazo vencido, o silêncio já decidiu a
            // questão a favor do parceiro. Decidir antes disso suprimiria o
            // contraditório — o servidor recusa os dois casos.
            const silencioDaEmpresa =
              !d.respondida_em && new Date() > new Date(d.prazo_resposta_em);
            const madura = Boolean(d.respondida_em) || silencioDaEmpresa;

            return (
            <Card key={d.id} className="border-espera/50">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{d.indicacoes?.lead_empresa_nome ?? "—"}</p>
                    <Pill tom="espera">
                      {d.respondida_em ? "Aguardando decisão" : "Aguardando resposta da empresa"}
                    </Pill>
                    {silencioDaEmpresa && (
                      <Pill tom="erro" title="Prazo de resposta vencido sem manifestação — política 06 §7.">
                        Silêncio da empresa
                      </Pill>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Aberta em {formatDataHora(d.aberta_em)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium">
                    {formatCents(d.indicacoes?.comissao_cents ?? 0)}
                  </p>
                  <p className="text-xs text-espera mt-1">
                    {d.respondida_em
                      ? d.prazo_decisao_em
                        ? `decisão ${formatPrazo(d.prazo_decisao_em)}`
                        : "decisão pendente"
                      : `resposta ${formatPrazo(d.prazo_resposta_em)}`}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border/60 space-y-3 text-sm">
                <Bloco titulo="Recusa da empresa">
                  {d.indicacoes?.motivo_recusa ?? "—"}
                  {d.indicacoes?.motivo_recusa_detalhe ? ` — ${d.indicacoes.motivo_recusa_detalhe}` : ""}
                </Bloco>
                <Bloco titulo="Contestação do parceiro">{d.motivo}</Bloco>
                {d.resposta_empresa && (
                  <Bloco titulo="Resposta da empresa">{d.resposta_empresa}</Bloco>
                )}
                <Bloco titulo="Log da plataforma">
                  <span className="font-mono text-xs">
                    registrada em {formatDataHora(d.indicacoes?.registrada_em)}
                    {d.indicacoes?.registrada_ip ? ` · IP ${d.indicacoes.registrada_ip}` : ""}
                  </span>
                </Bloco>
              </div>

              {madura ? (
                <DecisaoForm disputaId={d.id} silencioDaEmpresa={silencioDaEmpresa} />
              ) : (
                <p className="mt-4 pt-4 border-t border-border/60 text-xs text-muted">
                  A empresa ainda está dentro do prazo de resposta ({formatPrazo(d.prazo_resposta_em)}).
                  A decisão abre quando ela responder ou quando o prazo vencer.
                </p>
              )}
            </Card>
            );
          })}
        </div>
      )}

      {decididas.length > 0 && (
        <>
          <h2 className="text-sm uppercase tracking-wide text-muted mt-10 mb-4">Decididas</h2>
          <div className="space-y-3">
            {decididas.map((d) => (
              <Card key={d.id} className="opacity-80">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {d.indicacoes?.lead_empresa_nome ?? "—"}
                    </p>
                    <p className="text-xs text-muted">{formatDataHora(d.decidida_em)}</p>
                  </div>
                  <Pill tom={d.decisao === "procedente" ? "ok" : "erro"}>
                    {d.decisao === "procedente" ? "Procedente" : "Improcedente"}
                  </Pill>
                </div>
                {d.decisao_fundamentacao && (
                  <p className="text-sm text-muted mt-3 pt-3 border-t border-border/60">
                    {d.decisao_fundamentacao}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted">{titulo}</p>
      <p className="text-muted mt-1">{children}</p>
    </div>
  );
}
