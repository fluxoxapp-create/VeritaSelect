import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Card, Pill, EmptyState } from "@/components/ui";
import { formatData, formatDataHora, diasAte } from "@/lib/format";
import { CONSELHO_LABEL, type Conselho } from "@/lib/domain/atividades";
import { VerificacaoForm } from "./verificacao-form";

export const metadata = { title: "Habilitações" };

type Habilitacao = {
  id: string;
  parceiro_id: string;
  conselho: Conselho;
  numero: string;
  uf: string;
  validade: string;
  situacao_declarada: string;
  nome_no_registro: string;
  documento_path: string;
  status: "nao_enviada" | "pendente" | "aprovada" | "reprovada";
  verificada_em: string | null;
  fonte_consultada: string | null;
  motivo_reprovacao: string | null;
  created_at: string;
  profiles: { full_name: string } | null;
};

const STATUS = {
  nao_enviada: { label: "Não enviada", tom: "neutro" },
  pendente: { label: "Aguardando verificação", tom: "espera" },
  aprovada: { label: "Aprovada", tom: "ok" },
  reprovada: { label: "Reprovada", tom: "erro" },
} as const;

export default async function AdminHabilitacoes({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const filtro = sp.status ?? "pendente";

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("habilitacoes")
    .select(
      "id, parceiro_id, conselho, numero, uf, validade, situacao_declarada, nome_no_registro, documento_path, status, verificada_em, fonte_consultada, motivo_reprovacao, created_at, profiles:parceiro_id(full_name)",
    )
    .order("created_at", { ascending: true });

  if (filtro !== "todas") query = query.eq("status", filtro);

  const { data } = await query;
  const habilitacoes = (data ?? []) as unknown as Habilitacao[];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <Link href="/admin" className="text-sm text-muted hover:text-foreground">
        ← Painel admin
      </Link>

      <div className="mt-6">
        <PageHeader
          titulo="Habilitações profissionais"
          descricao="Confira o registro na consulta pública do conselho. A verificação confirma existência, titularidade, situação ativa e validade — ela não atesta competência técnica nem idoneidade. Prazo: 3 dias úteis."
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(["pendente", "aprovada", "reprovada", "todas"] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/habilitacoes?status=${s}`}
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

      {habilitacoes.length === 0 ? (
        <EmptyState
          titulo="Nada nesta fila"
          descricao="Credenciais enviadas por parceiros aparecem aqui para verificação manual."
        />
      ) : (
        <div className="space-y-4">
          {habilitacoes.map((h) => {
            const st = STATUS[h.status];
            const dias = diasAte(h.validade);
            const vencida = dias !== null && dias < 0;
            return (
              <Card key={h.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">
                        {CONSELHO_LABEL[h.conselho]} {h.numero}/{h.uf}
                      </p>
                      <Pill tom={st.tom}>{st.label}</Pill>
                      {vencida && <Pill tom="erro">Vencida</Pill>}
                    </div>
                    <p className="text-sm text-muted mt-1">
                      Cadastro: {h.profiles?.full_name ?? "—"}
                    </p>
                    <p className="text-sm text-muted">Registro: {h.nome_no_registro}</p>
                    <p className="text-xs text-muted mt-1">
                      Enviada em {formatDataHora(h.created_at)} · situação declarada:{" "}
                      {h.situacao_declarada}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted">Validade</p>
                    <p className={`text-sm ${vencida ? "text-erro" : ""}`}>
                      {formatData(h.validade)}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted mt-3 font-mono break-all">
                  documento: {h.documento_path}
                </p>
                <p className="text-xs text-muted mt-1">
                  O arquivo fica em bucket privado. Todo acesso é logado — abra apenas o
                  necessário para conferir a credencial.
                </p>

                {h.status === "aprovada" && (
                  <p className="text-xs text-muted mt-3 pt-3 border-t border-border/60">
                    Verificada em {formatDataHora(h.verificada_em)}
                    {h.fonte_consultada ? ` · fonte: ${h.fonte_consultada}` : ""}
                  </p>
                )}

                {h.status === "reprovada" && (
                  <div className="mt-3 pt-3 border-t border-border/60">
                    <p className="text-sm text-erro">{h.motivo_reprovacao}</p>
                    <p className="text-xs text-muted mt-1">
                      {formatDataHora(h.verificada_em)}
                      {h.fonte_consultada ? ` · fonte: ${h.fonte_consultada}` : ""}
                    </p>
                  </div>
                )}

                {h.status === "pendente" && <VerificacaoForm habilitacaoId={h.id} />}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
