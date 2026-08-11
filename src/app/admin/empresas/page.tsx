import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Card, Pill, EmptyState } from "@/components/ui";
import { formatCnpj, formatDataHora } from "@/lib/format";
import { KybForm, SeloForm } from "./kyb-form";

export const metadata = { title: "Empresas" };

type Empresa = {
  id: string;
  slug: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  representante_legal_nome: string;
  email_contato: string;
  site: string | null;
  kyb_status: "nao_enviada" | "pendente" | "aprovada" | "reprovada";
  kyb_motivo_reprovacao: string | null;
  kyb_revisado_em: string | null;
  selo_pendencia_pagamento: boolean;
  assinatura_ativa: boolean;
  created_at: string;
};

const STATUS = {
  nao_enviada: { label: "KYB não enviado", tom: "neutro" },
  pendente: { label: "KYB pendente", tom: "espera" },
  aprovada: { label: "Aprovada", tom: "ok" },
  reprovada: { label: "Reprovada", tom: "erro" },
} as const;

export default async function AdminEmpresas({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const filtro = sp.status ?? "todas";

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("empresas")
    .select(
      "id, slug, razao_social, nome_fantasia, cnpj, representante_legal_nome, email_contato, site, kyb_status, kyb_motivo_reprovacao, kyb_revisado_em, selo_pendencia_pagamento, assinatura_ativa, created_at",
    )
    .order("created_at", { ascending: false });

  if (filtro !== "todas") query = query.eq("kyb_status", filtro);

  const { data } = await query;
  const empresas = (data ?? []) as unknown as Empresa[];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <Link href="/admin" className="text-sm text-muted hover:text-foreground">
        ← Painel admin
      </Link>

      <div className="mt-6">
        <PageHeader
          titulo="Empresas"
          descricao="Só empresa aprovada aparece publicamente e consegue publicar campanha. Publicar é endosso — sem verificação, é responsabilidade que não temos como sustentar."
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(["todas", "pendente", "aprovada", "reprovada", "nao_enviada"] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/empresas?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              filtro === s
                ? "border-gold/50 bg-gold/10 text-gold-soft"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {s === "todas" ? "Todas" : STATUS[s].label}
          </Link>
        ))}
      </div>

      {empresas.length === 0 ? (
        <EmptyState titulo="Nenhuma empresa" descricao="Empresas cadastradas aparecem aqui." />
      ) : (
        <div className="space-y-4">
          {empresas.map((e) => {
            const st = STATUS[e.kyb_status];
            return (
              <Card key={e.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{e.nome_fantasia}</p>
                      <Pill tom={st.tom}>{st.label}</Pill>
                      {e.selo_pendencia_pagamento && <Pill tom="erro">Pendência de pagamento</Pill>}
                      {e.assinatura_ativa && <Pill tom="gold">Assinatura ativa</Pill>}
                    </div>
                    <p className="text-sm text-muted mt-1">{e.razao_social}</p>
                    <p className="text-xs text-muted mt-1 font-mono">{formatCnpj(e.cnpj)}</p>
                    <p className="text-xs text-muted mt-1">
                      Representante: {e.representante_legal_nome} · {e.email_contato}
                    </p>
                    {e.site && (
                      <a
                        href={e.site}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-xs text-gold-soft hover:text-gold mt-1 inline-block"
                      >
                        {e.site}
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-muted shrink-0">
                    Cadastrada em {formatDataHora(e.created_at)}
                  </p>
                </div>

                {e.kyb_status === "reprovada" && e.kyb_motivo_reprovacao && (
                  <div className="mt-3 pt-3 border-t border-border/60">
                    <p className="text-sm text-erro">{e.kyb_motivo_reprovacao}</p>
                    <p className="text-xs text-muted mt-1">{formatDataHora(e.kyb_revisado_em)}</p>
                  </div>
                )}

                {(e.kyb_status === "pendente" || e.kyb_status === "nao_enviada") && (
                  <KybForm empresaId={e.id} />
                )}

                {e.kyb_status === "aprovada" && (
                  <SeloForm empresaId={e.id} ativo={e.selo_pendencia_pagamento} />
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
