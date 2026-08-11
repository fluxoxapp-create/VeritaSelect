import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireEmpresa } from "@/lib/auth/session";
import { PageHeader, Card, Pill, EmptyState, BotaoLink } from "@/components/ui";
import { formatCents, formatData, formatDataHora, formatPrazo, diasAte } from "@/lib/format";
import { MOTIVO_RECUSA_INFO, PRAZOS_FIXOS, type MotivoRecusa } from "@/lib/domain/indicacoes";
import { RespostaForm } from "./resposta-form";

export const metadata: Metadata = { title: "Contestações" };

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
    id: string;
    lead_empresa_nome: string;
    comissao_cents: number;
    status: string;
    registrada_em: string;
    motivo_recusa: MotivoRecusa | null;
    motivo_recusa_detalhe: string | null;
    estorno_motivo: string | null;
    campanhas: { titulo: string } | null;
  } | null;
};

export default async function DisputasEmpresa() {
  await requireEmpresa();
  const supabase = await createSupabaseServerClient();

  // "partes leem a disputa" limita ao próprio tenant — o escopo não vem daqui.
  const { data } = await supabase
    .from("disputas")
    .select(
      "id, motivo, aberta_em, prazo_resposta_em, prazo_decisao_em, resposta_empresa, respondida_em, decisao, decisao_fundamentacao, decidida_em, indicacoes(id, lead_empresa_nome, comissao_cents, status, registrada_em, motivo_recusa, motivo_recusa_detalhe, estorno_motivo, campanhas(titulo))",
    )
    .order("aberta_em", { ascending: true });

  const disputas = (data ?? []) as unknown as Disputa[];
  const abertas = disputas.filter((d) => !d.decidida_em);
  const decididas = disputas.filter((d) => d.decidida_em);

  return (
    <>
      <PageHeader
        titulo="Contestações"
        descricao={`O parceiro contestou uma recusa ou um estorno. Você tem ${PRAZOS_FIXOS.respostaEmpresaDias} dias para responder — o silêncio implica procedência da contestação.`}
      />

      {abertas.length === 0 ? (
        <EmptyState
          titulo="Nenhuma contestação em aberto"
          descricao="Contestações aparecem aqui com o prazo de resposta correndo. Recusa fundamentada e com prova datada é o que evita que cheguem."
          acao={
            <BotaoLink href="/empresa/indicacoes" variante="secundario" tamanho="sm">
              Ver fila de aprovação
            </BotaoLink>
          }
        />
      ) : (
        <div className="space-y-4">
          {abertas.map((d) => {
            const i = d.indicacoes;
            const dias = diasAte(d.prazo_resposta_em);
            const vencido = dias !== null && dias < 0;
            const urgente = !d.respondida_em && dias !== null && dias <= 2;

            return (
              <Card key={d.id} className={urgente || vencido ? "border-espera/50" : ""}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{i?.lead_empresa_nome ?? "—"}</p>
                      <Pill tom="espera">
                        {d.respondida_em ? "Aguardando decisão da plataforma" : "Aguardando sua resposta"}
                      </Pill>
                    </div>
                    <p className="text-sm text-muted mt-1">{i?.campanhas?.titulo ?? "—"}</p>
                    <p className="text-xs text-muted mt-1">
                      Indicação registrada em {formatDataHora(i?.registrada_em)} · contestada em{" "}
                      {formatData(d.aberta_em)}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted">Comissão em disputa</p>
                    <p className="text-lg font-semibold">{formatCents(i?.comissao_cents ?? 0)}</p>
                    <p className={`text-xs mt-1 ${vencido || urgente ? "text-espera" : "text-muted"}`}>
                      {d.respondida_em
                        ? d.prazo_decisao_em
                          ? `decisão ${formatPrazo(d.prazo_decisao_em)}`
                          : "decisão pendente"
                        : `resposta ${formatPrazo(d.prazo_resposta_em)}`}
                    </p>
                  </div>
                </div>

                {!d.respondida_em && vencido && (
                  <p className="mt-3 text-xs text-espera">
                    O prazo de resposta venceu. Pela política de comissionamento, o silêncio implica
                    procedência da contestação — a plataforma decidirá com o que já está registrado.
                  </p>
                )}

                <div className="mt-4 pt-4 border-t border-border/60 space-y-3 text-sm">
                  <Bloco titulo="Sua decisão">
                    {i?.motivo_recusa ? (
                      <>
                        {MOTIVO_RECUSA_INFO[i.motivo_recusa].label}
                        {i.motivo_recusa_detalhe ? ` — ${i.motivo_recusa_detalhe}` : ""}
                        <span className="block text-xs mt-1.5">
                          Prova exigida: {MOTIVO_RECUSA_INFO[i.motivo_recusa].prova}
                        </span>
                      </>
                    ) : (
                      (i?.estorno_motivo ?? "—")
                    )}
                  </Bloco>
                  <Bloco titulo="Contestação do parceiro">{d.motivo}</Bloco>
                  {d.resposta_empresa && (
                    <Bloco titulo="Sua resposta">
                      {d.resposta_empresa}
                      <span className="block text-xs mt-1.5">
                        registrada em {formatDataHora(d.respondida_em)}
                      </span>
                    </Bloco>
                  )}
                </div>

                {!d.respondida_em && !vencido && <RespostaForm disputaId={d.id} />}
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
                    <p className="text-xs text-muted">
                      {formatCents(d.indicacoes?.comissao_cents ?? 0)} ·{" "}
                      {formatDataHora(d.decidida_em)}
                    </p>
                  </div>
                  <Pill tom={d.decisao === "procedente" ? "erro" : "ok"}>
                    {d.decisao === "procedente" ? "Contestação procedente" : "Contestação improcedente"}
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

      <p className="text-xs text-muted mt-8">
        A decisão da plataforma é administrativa e não vinculante. Nenhuma das partes renuncia ao
        acesso ao Judiciário ao usar este canal.
      </p>
    </>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted">{titulo}</p>
      <div className="text-muted mt-1">{children}</div>
    </div>
  );
}
