import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader, Card, Pill, EmptyState, BotaoLink } from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatComissao, formatData } from "@/lib/format";
import { infoAtividade, type Atividade } from "@/lib/domain/atividades";

export const metadata: Metadata = { title: "Campanhas" };

type Campanha = {
  id: string;
  slug: string;
  titulo: string;
  produto: string;
  status: "rascunho" | "em_revisao" | "publicada" | "pausada" | "encerrada";
  atividade_parceiro: Atividade;
  comissao_cents: number;
  comissao_recorrente: boolean;
  publicada_em: string | null;
  created_at: string;
};

const STATUS = {
  rascunho: { label: "Rascunho", tom: "neutro" },
  em_revisao: { label: "Em revisão", tom: "espera" },
  publicada: { label: "Publicada", tom: "ok" },
  pausada: { label: "Pausada", tom: "espera" },
  encerrada: { label: "Encerrada", tom: "neutro" },
} as const;

export default async function CampanhasEmpresa() {
  const supabase = await createSupabaseServerClient();
  // Sem filtro por empresa: a policy `empresa gerencia as proprias campanhas`
  // já limita ao tenant resolvido da sessão.
  const { data } = await supabase
    .from("campanhas")
    .select(
      "id, slug, titulo, produto, status, atividade_parceiro, comissao_cents, comissao_recorrente, publicada_em, created_at",
    )
    .order("created_at", { ascending: false });

  const campanhas = (data ?? []) as unknown as Campanha[];

  return (
    <>
      <PageHeader
        titulo="Campanhas"
        descricao="Alterar uma campanha só afeta indicações futuras. As já registradas mantêm congelados a comissão e os prazos vigentes no momento do registro."
        acao={<BotaoLink href="/empresa/campanhas/nova">Nova campanha</BotaoLink>}
      />

      {campanhas.length === 0 ? (
        <EmptyState
          titulo="Nenhuma campanha ainda"
          descricao="Publique a comissão que você paga e o que conta como resultado útil. Parceiros aderem, indicam clientes, e você só paga quando aprovar."
          acao={<BotaoLink href="/empresa/campanhas/nova" variante="secundario" tamanho="sm">Criar a primeira</BotaoLink>}
        />
      ) : (
        <div className="space-y-4">
          {campanhas.map((c) => {
            const st = STATUS[c.status];
            const atividade = infoAtividade(c.atividade_parceiro);
            return (
              <Card key={c.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {c.status === "publicada" || c.status === "pausada" ? (
                        <Link
                          href={`/campanhas/${c.slug}`}
                          className="font-medium hover:text-gold-soft transition-colors"
                        >
                          {c.titulo}
                        </Link>
                      ) : (
                        <span className="font-medium">{c.titulo}</span>
                      )}
                      <Pill tom={st.tom}>{st.label}</Pill>
                      {atividade.regime === "habilitacao" && (
                        <Pill tom="espera" title={`Exige credencial ${atividade.conselho?.toUpperCase()} verificada e vigente`}>
                          Regulada
                        </Pill>
                      )}
                    </div>
                    <p className="text-sm text-muted mt-1">{c.produto}</p>
                    <p className="text-xs text-muted mt-1">
                      {c.publicada_em
                        ? `Publicada em ${formatData(c.publicada_em)}`
                        : `Criada em ${formatData(c.created_at)}`}
                      {" · "}
                      {atividade.label}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted">Comissão</p>
                    <p className="text-lg font-semibold text-gold-soft">
                      {formatComissao(c.comissao_cents, c.comissao_recorrente)}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
