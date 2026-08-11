import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader, Pill, EmptyState, BotaoLink } from "@/components/ui";
import { listarCampanhasPublicas, listarSegmentosDisponiveis } from "@/lib/data/campanhas";
import { formatComissao, formatCents, parseCents } from "@/lib/format";
import { infoAtividade, type Regime } from "@/lib/domain/atividades";

export const metadata: Metadata = {
  title: "Campanhas",
  description:
    "Campanhas abertas para parceiros comerciais autônomos: comissão, público-alvo, ticket e o que conta como resultado útil, tudo à vista antes da adesão.",
};

type Busca = {
  segmento?: string;
  regime?: string;
  comissaoMin?: string;
  recorrente?: string;
  q?: string;
};

export default async function CampanhasPage({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const sp = await searchParams;

  const regime: Regime | undefined =
    sp.regime === "livre" || sp.regime === "habilitacao" ? sp.regime : undefined;

  const [campanhas, segmentos] = await Promise.all([
    listarCampanhasPublicas({
      segmento: sp.segmento || undefined,
      regime,
      comissaoMin: sp.comissaoMin ? (parseCents(sp.comissaoMin) ?? undefined) : undefined,
      recorrente: sp.recorrente === "1" ? true : undefined,
      busca: sp.q || undefined,
    }),
    listarSegmentosDisponiveis(),
  ]);

  const temFiltro = Boolean(sp.segmento || sp.regime || sp.comissaoMin || sp.recorrente || sp.q);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
      <PageHeader
        titulo="Campanhas abertas"
        descricao="Comissão, público-alvo e o que a empresa reconhece como resultado útil — tudo publicado antes da adesão. Você escolhe onde investir seu tempo."
      />

      <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-8">
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Buscar produto ou empresa"
          className="lg:col-span-2 rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:border-gold/50"
        />
        <select
          name="segmento"
          defaultValue={sp.segmento ?? ""}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:border-gold/50"
        >
          <option value="">Todos os segmentos</option>
          {segmentos.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          name="regime"
          defaultValue={sp.regime ?? ""}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:border-gold/50"
        >
          <option value="">Regulado ou não</option>
          <option value="livre">Sem exigência de credencial</option>
          <option value="habilitacao">Exige credencial (SUSEP / CRECI / CVM)</option>
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-md bg-gold text-background text-sm font-medium px-4 py-2 hover:bg-gold-soft transition-colors cursor-pointer"
          >
            Filtrar
          </button>
          {temFiltro && (
            <Link
              href="/campanhas"
              className="rounded-md border border-border px-3 py-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              Limpar
            </Link>
          )}
        </div>
      </form>

      {campanhas.length === 0 ? (
        <EmptyState
          titulo={temFiltro ? "Nenhuma campanha com esses filtros" : "Nenhuma campanha publicada ainda"}
          descricao={
            temFiltro
              ? "Tente ampliar a busca — retirar o filtro de segmento costuma trazer resultado."
              : "A plataforma está em construção. A Fase 0 — constituição da PJ, revisão dos contratos por advogado e definição das faixas de taxa — precisa fechar antes da primeira campanha real ir ao ar."
          }
          acao={temFiltro ? <BotaoLink href="/campanhas" variante="secundario" tamanho="sm">Limpar filtros</BotaoLink> : undefined}
        />
      ) : (
        <>
          <p className="text-sm text-muted mb-5">
            {campanhas.length} {campanhas.length === 1 ? "campanha" : "campanhas"}
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {campanhas.map((c) => {
              const atividade = infoAtividade(c.atividade_parceiro);
              return (
                <Link
                  key={c.id}
                  href={`/campanhas/${c.slug}`}
                  className="flex flex-col rounded-xl border border-border bg-surface p-5 hover:border-gold/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs text-muted truncate">{c.empresa_nome}</span>
                    <div className="flex gap-1.5 shrink-0">
                      {c.status === "pausada" && <Pill tom="espera">Pausada</Pill>}
                      {c.selo_pendencia_pagamento && (
                        <Pill tom="erro" title="Esta empresa tem pagamento de comissão em atraso registrado na plataforma.">
                          Pendência
                        </Pill>
                      )}
                    </div>
                  </div>

                  <p className="font-medium mt-2 leading-snug">{c.titulo}</p>
                  <p className="text-sm text-muted mt-1 line-clamp-2">{c.produto}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Pill>{c.segmento_mercado}</Pill>
                    {c.comissao_recorrente && <Pill tom="gold">Recorrente</Pill>}
                    {atividade.regime === "habilitacao" && (
                      <Pill tom="espera" title={`Exige credencial ${atividade.conselho?.toUpperCase()} verificada`}>
                        Exige credencial
                      </Pill>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-border/60 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted">Comissão</p>
                      <p className="text-lg font-semibold text-gold-soft">
                        {formatComissao(c.comissao_cents, c.comissao_recorrente)}
                      </p>
                    </div>
                    {c.ticket_cents && (
                      <div className="text-right">
                        <p className="text-xs text-muted">Ticket</p>
                        <p className="text-sm">{formatCents(c.ticket_cents)}</p>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
