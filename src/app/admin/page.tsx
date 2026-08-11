import Link from "next/link";
import { logoutAdmin } from "./actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Card, Pill } from "@/components/ui";
import { formatCents, formatDataHora } from "@/lib/format";

export const metadata = { title: "Painel admin" };

type EventoAuditoria = {
  id: number;
  action: string;
  actor_role: string | null;
  actor_ip: string | null;
  created_at: string;
  target_table: string | null;
};

export default async function AdminPage() {
  const supabase = createSupabaseAdminClient();

  const [
    { count: habilitacoesPendentes },
    { count: kybPendentes },
    { count: disputasAbertas },
    { count: denunciasAbertas },
    { count: totalParceiros },
    { count: totalEmpresas },
    { count: campanhasPublicadas },
    { count: faixasDefinidas },
    { data: aprovadas },
    { data: auditoria },
  ] = await Promise.all([
    supabase.from("habilitacoes").select("id", { count: "exact", head: true }).eq("status", "pendente"),
    supabase.from("empresas").select("id", { count: "exact", head: true }).eq("kyb_status", "pendente"),
    supabase.from("disputas").select("id", { count: "exact", head: true }).is("decidida_em", null),
    supabase.from("denuncias").select("id", { count: "exact", head: true }).eq("status", "aberta"),
    supabase.from("parceiros").select("id", { count: "exact", head: true }),
    supabase.from("empresas").select("id", { count: "exact", head: true }),
    supabase.from("campanhas").select("id", { count: "exact", head: true }).eq("status", "publicada"),
    supabase.from("faixas_taxa").select("id", { count: "exact", head: true }),
    supabase.from("indicacoes").select("comissao_cents, taxa_cents").in("status", ["aprovada", "paga"]),
    supabase
      .from("audit_log")
      .select("id, action, actor_role, actor_ip, created_at, target_table")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const comissaoMovimentada = (aprovadas ?? []).reduce(
    (s, r) => s + ((r.comissao_cents as number) ?? 0),
    0,
  );
  const taxaApurada = (aprovadas ?? []).reduce((s, r) => s + ((r.taxa_cents as number) ?? 0), 0);
  const semFaixa = (aprovadas ?? []).filter((r) => r.taxa_cents === null).length;

  const FILAS = [
    {
      label: "Habilitações aguardando verificação",
      valor: habilitacoesPendentes ?? 0,
      href: "/admin/habilitacoes",
      prazo: "3 dias úteis",
    },
    {
      label: "Empresas aguardando KYB",
      valor: kybPendentes ?? 0,
      href: "/admin/empresas",
      prazo: "—",
    },
    {
      label: "Disputas sem decisão",
      valor: disputasAbertas ?? 0,
      href: "/admin/disputas",
      prazo: "10 dias úteis",
    },
    {
      label: "Denúncias abertas",
      valor: denunciasAbertas ?? 0,
      href: "/admin/denuncias",
      prazo: "48h para resposta",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-wide text-erro">Painel administrativo</p>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">Verita Select · DealBridge</h1>
        </div>
        <form action={logoutAdmin}>
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            Sair
          </button>
        </form>
      </div>

      <h2 className="text-sm uppercase tracking-wide text-muted mb-4">Filas com prazo</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {FILAS.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className={`rounded-xl border p-5 transition-colors ${
              f.valor > 0 ? "border-espera/50 bg-espera/5 hover:border-espera" : "border-border bg-surface hover:border-gold/40"
            }`}
          >
            <p className={`text-3xl font-semibold ${f.valor > 0 ? "text-espera" : ""}`}>{f.valor}</p>
            <p className="text-sm mt-2">{f.label}</p>
            <p className="text-xs text-muted mt-1">prazo: {f.prazo}</p>
          </Link>
        ))}
      </div>

      {(faixasDefinidas ?? 0) === 0 && (
        <Card className="mb-10 border-espera/50">
          <p className="font-medium text-espera">Faixas de taxa não definidas</p>
          <p className="text-sm text-muted mt-2">
            Sem a tabela de faixas, nenhuma indicação aprovada gera taxa —{" "}
            <strong className="text-foreground">{semFaixa}</strong>{" "}
            {semFaixa === 1 ? "aprovação está" : "aprovações estão"} sem precificação. Definir as
            faixas é item aberto da Fase 0, junto com CNPJ, revisão dos contratos e indicação do
            DPO. A cobrança só passa a valer para indicações registradas depois da vigência.
          </p>
        </Card>
      )}

      <h2 className="text-sm uppercase tracking-wide text-muted mb-4">Volume</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-10">
        <Numero label="Parceiros" valor={String(totalParceiros ?? 0)} />
        <Numero label="Empresas" valor={String(totalEmpresas ?? 0)} />
        <Numero label="Campanhas publicadas" valor={String(campanhasPublicadas ?? 0)} />
        <Numero
          label="Comissão movimentada"
          valor={formatCents(comissaoMovimentada)}
          detalhe="pago pelas empresas, fora da plataforma"
        />
        <Numero label="Taxa apurada" valor={formatCents(taxaApurada)} detalhe="nossa receita" />
      </div>

      <h2 className="text-sm uppercase tracking-wide text-muted mb-4">
        Auditoria — últimos eventos
      </h2>
      <Card>
        {!auditoria?.length ? (
          <p className="text-sm text-muted">Nenhum evento registrado.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {(auditoria as unknown as EventoAuditoria[]).map((e) => (
              <li key={e.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <code className="text-xs text-gold-soft">{e.action}</code>
                  {e.actor_role && <Pill>{e.actor_role}</Pill>}
                  {e.target_table && (
                    <span className="text-xs text-muted truncate">{e.target_table}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted shrink-0">
                  {e.actor_ip && <span className="font-mono">{e.actor_ip}</span>}
                  <span>{formatDataHora(e.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted mt-4 pt-4 border-t border-border/60">
          O log é append-only por trigger no banco: nem esta aplicação nem a chave de serviço
          conseguem alterar ou apagar um evento. Retenção mínima de 6 meses (Marco Civil art. 15).
        </p>
      </Card>
    </div>
  );
}

function Numero({
  label,
  valor,
  detalhe,
}: {
  label: string;
  valor: string;
  detalhe?: string;
}) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="text-2xl font-semibold mt-2">{valor}</p>
      {detalhe && <p className="text-xs text-muted mt-1">{detalhe}</p>}
    </Card>
  );
}
