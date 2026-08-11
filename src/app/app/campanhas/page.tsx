import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader, Card, Pill, EmptyState, BotaoLink } from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatComissao, formatData } from "@/lib/format";

export const metadata: Metadata = { title: "Minhas campanhas" };

type Adesao = {
  id: string;
  status: "ativa" | "encerrada";
  certificacao: "nao_exigida" | "pendente" | "aprovada" | "reprovada";
  aderida_em: string;
  encerrada_motivo: string | null;
  campanhas: {
    slug: string;
    titulo: string;
    produto: string;
    status: string;
    comissao_cents: number;
    comissao_recorrente: boolean;
    empresas: { nome_fantasia: string } | null;
  } | null;
};

export default async function MinhasCampanhas() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("adesoes")
    .select(
      "id, status, certificacao, aderida_em, encerrada_motivo, campanhas(slug, titulo, produto, status, comissao_cents, comissao_recorrente, empresas(nome_fantasia))",
    )
    .order("aderida_em", { ascending: false });

  const adesoes = (data ?? []) as unknown as Adesao[];
  const ativas = adesoes.filter((a) => a.status === "ativa");
  const encerradas = adesoes.filter((a) => a.status === "encerrada");

  return (
    <>
      <PageHeader
        titulo="Minhas campanhas"
        descricao="Sem exclusividade: você atua em quantas quiser e encerra quando quiser. Indicações já registradas continuam valendo dentro da janela de atribuição."
        acao={<BotaoLink href="/campanhas">Buscar campanhas</BotaoLink>}
      />

      {adesoes.length === 0 ? (
        <EmptyState
          titulo="Você ainda não aderiu a nenhuma campanha"
          descricao="A adesão gera o Contrato de Campanha, congelado e assinado eletronicamente. É ele que prova o que foi combinado — comissão, prazos e o que conta como resultado útil."
          acao={<BotaoLink href="/campanhas" variante="secundario" tamanho="sm">Ver campanhas abertas</BotaoLink>}
        />
      ) : (
        <>
          <div className="space-y-4">
            {ativas.map((a) => (
              <Card key={a.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/campanhas/${a.campanhas?.slug ?? ""}`}
                        className="font-medium hover:text-gold-soft transition-colors"
                      >
                        {a.campanhas?.titulo ?? "Campanha removida"}
                      </Link>
                      <Pill tom="ok">Adesão ativa</Pill>
                      {a.campanhas?.status === "pausada" && (
                        <Pill tom="espera" title="A empresa pausou novas adesões. A sua continua valendo.">
                          Campanha pausada
                        </Pill>
                      )}
                      {a.certificacao === "pendente" && (
                        <Pill tom="espera">Certificação pendente</Pill>
                      )}
                    </div>
                    <p className="text-sm text-muted mt-1">
                      {a.campanhas?.empresas?.nome_fantasia ?? "—"} · {a.campanhas?.produto ?? ""}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      Aderida em {formatData(a.aderida_em)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-semibold text-gold-soft">
                      {a.campanhas
                        ? formatComissao(a.campanhas.comissao_cents, a.campanhas.comissao_recorrente)
                        : "—"}
                    </p>
                    <div className="mt-2">
                      <BotaoLink href="/app/indicacoes/nova" variante="secundario" tamanho="sm">
                        Registrar indicação
                      </BotaoLink>
                    </div>
                  </div>
                </div>

                {a.certificacao === "pendente" && (
                  <p className="text-sm text-muted mt-4 pt-4 border-t border-border/60">
                    Esta campanha exige certificação de produto antes de liberar o registro de
                    indicações. É material da empresa mais um questionário — não é treinamento
                    obrigatório nem cria vínculo.
                  </p>
                )}
              </Card>
            ))}
          </div>

          {encerradas.length > 0 && (
            <>
              <h2 className="text-sm uppercase tracking-wide text-muted mt-10 mb-4">
                Adesões encerradas
              </h2>
              <div className="space-y-3">
                {encerradas.map((a) => (
                  <Card key={a.id} className="opacity-70">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {a.campanhas?.titulo ?? "Campanha removida"}
                        </p>
                        <p className="text-xs text-muted">
                          {a.encerrada_motivo ?? "Encerrada por você"}
                        </p>
                      </div>
                      <Pill>Encerrada</Pill>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
