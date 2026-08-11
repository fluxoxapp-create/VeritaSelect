import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Card, Pill, EmptyState } from "@/components/ui";
import { formatDataHora } from "@/lib/format";

export const metadata = { title: "Denúncias" };

type Denuncia = {
  id: string;
  motivo: string;
  descricao: string;
  status: "aberta" | "em_analise" | "procedente" | "improcedente";
  resposta: string | null;
  analisada_em: string | null;
  created_at: string;
  campanhas: { titulo: string; slug: string } | null;
};

const STATUS = {
  aberta: { label: "Aberta", tom: "espera" },
  em_analise: { label: "Em análise", tom: "espera" },
  procedente: { label: "Procedente", tom: "erro" },
  improcedente: { label: "Improcedente", tom: "neutro" },
} as const;

export default async function AdminDenuncias() {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("denuncias")
    .select("id, motivo, descricao, status, resposta, analisada_em, created_at, campanhas(titulo, slug)")
    .order("created_at", { ascending: true });

  const denuncias = (data ?? []) as unknown as Denuncia[];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <Link href="/admin" className="text-sm text-muted hover:text-foreground">
        ← Painel admin
      </Link>

      <div className="mt-6">
        <PageHeader
          titulo="Denúncias"
          descricao="Canal visível em toda campanha, com prazo de resposta. Campanha denunciada pode ser suspensa em até 48 horas enquanto a apuração corre."
        />
      </div>

      {denuncias.length === 0 ? (
        <EmptyState
          titulo="Nenhuma denúncia"
          descricao="Denúncias sobre campanhas ou condutas aparecem aqui."
        />
      ) : (
        <div className="space-y-4">
          {denuncias.map((d) => {
            const st = STATUS[d.status];
            return (
              <Card key={d.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{d.motivo}</p>
                      <Pill tom={st.tom}>{st.label}</Pill>
                    </div>
                    {d.campanhas && (
                      <Link
                        href={`/campanhas/${d.campanhas.slug}`}
                        className="text-sm text-gold-soft hover:text-gold mt-1 inline-block"
                      >
                        {d.campanhas.titulo}
                      </Link>
                    )}
                  </div>
                  <p className="text-xs text-muted shrink-0">{formatDataHora(d.created_at)}</p>
                </div>

                <p className="text-sm text-muted mt-3 whitespace-pre-line">{d.descricao}</p>

                {d.resposta && (
                  <div className="mt-3 pt-3 border-t border-border/60">
                    <p className="text-xs uppercase tracking-wide text-muted">Resposta</p>
                    <p className="text-sm text-muted mt-1">{d.resposta}</p>
                    <p className="text-xs text-muted mt-1">{formatDataHora(d.analisada_em)}</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
