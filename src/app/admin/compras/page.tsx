import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho", pending_review: "Em análise",
  published: "Publicada", paused: "Pausada",
  drawing: "Apuração", completed: "Concluída", cancelled: "Cancelada",
};
const STATUS_COLOR: Record<string, string> = {
  published: "text-emerald-300 border-emerald-400/40",
  completed: "text-blue-300 border-blue-400/40",
  pending_review: "text-amber-300 border-amber-400/40",
  paused: "text-amber-300 border-amber-400/40",
  drawing: "text-gold-soft border-gold/40",
  draft: "text-muted border-border",
  cancelled: "text-red-400 border-red-400/40",
};

const fmtBrl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function AdminComprasPage() {
  const admin = createSupabaseAdminClient();

  // All raffles with organizer name
  const { data: rafflesRaw } = await admin
    .from("raffles")
    .select("id, title, status, created_at, draw_date, total_cotas, organizers(display_name)")
    .order("created_at", { ascending: false });

  // All compras aggregated — status + total_cents per raffle_id
  const { data: allCompras } = await admin
    .from("compras")
    .select("raffle_id, status, total_cents");

  // Build per-raffle stats map
  type Stats = { paid: number; revenue: number; refunded: number; pending: number };
  const statsMap = new Map<string, Stats>();
  for (const c of allCompras ?? []) {
    const s = statsMap.get(c.raffle_id) ?? { paid: 0, revenue: 0, refunded: 0, pending: 0 };
    if (c.status === "paid") { s.paid++; s.revenue += c.total_cents ?? 0; }
    if (c.status === "refunded") s.refunded += c.total_cents ?? 0;
    if (c.status === "pending_payment") s.pending++;
    statsMap.set(c.raffle_id, s);
  }

  const raffles = (rafflesRaw ?? []).map((r) => ({
    ...r,
    organizer: (Array.isArray(r.organizers) ? r.organizers[0] : r.organizers) as { display_name: string } | null,
    stats: statsMap.get(r.id) ?? { paid: 0, revenue: 0, refunded: 0, pending: 0 },
  }));

  // Platform-wide KPIs
  const totalRevenue = [...statsMap.values()].reduce((a, s) => a + s.revenue, 0);
  const totalRefunded = [...statsMap.values()].reduce((a, s) => a + s.refunded, 0);
  const totalPending = [...statsMap.values()].reduce((a, s) => a + s.pending, 0);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Compras por seleção</h1>
          <p className="text-muted text-sm mt-1">Clique em uma seleção para ver compradores, cotas e estornos.</p>
        </div>
        <Link href="/admin" className="text-sm text-muted hover:text-foreground transition-colors">
          ← Painel
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Receita confirmada", value: fmtBrl(totalRevenue), color: "text-emerald-300" },
          { label: "Estornos realizados", value: fmtBrl(totalRefunded), color: "text-blue-300" },
          { label: "Aguardando pagamento", value: String(totalPending), color: "text-amber-300" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">{k.label}</p>
            <p className={`text-lg font-semibold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Raffle cards */}
      {raffles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
          Nenhuma seleção cadastrada.
        </div>
      ) : (
        <div className="space-y-3">
          {raffles.map((raffle) => (
            <Link
              key={raffle.id}
              href={`/admin/selecoes/${raffle.id}/compras`}
              className="group block rounded-xl border border-border bg-surface hover:border-gold/40 hover:bg-surface-2/40 transition-colors p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Left: title + organizer + dates */}
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold group-hover:text-gold-soft transition-colors truncate">
                      {raffle.title}
                    </h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${STATUS_COLOR[raffle.status] ?? "text-muted border-border"}`}>
                      {STATUS_LABEL[raffle.status] ?? raffle.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted">
                    Organizador: <span className="text-foreground">{raffle.organizer?.display_name ?? "—"}</span>
                  </p>
                  <p className="text-xs text-muted">
                    Criada em{" "}
                    {new Date(raffle.created_at).toLocaleDateString("pt-BR")}
                    {" · "}
                    Apuração em{" "}
                    {new Date(raffle.draw_date).toLocaleDateString("pt-BR")}
                  </p>
                </div>

                {/* Right: stats */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted">Cotas vendidas</p>
                    <p className="font-semibold text-emerald-300 tabular-nums">
                      {raffle.stats.paid.toLocaleString("pt-BR")}
                      <span className="text-muted font-normal text-xs">/{raffle.total_cotas.toLocaleString("pt-BR")}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">Receita</p>
                    <p className="font-semibold tabular-nums">{fmtBrl(raffle.stats.revenue)}</p>
                  </div>
                  {raffle.stats.refunded > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-muted">Estornos</p>
                      <p className="font-semibold text-blue-300 tabular-nums">{fmtBrl(raffle.stats.refunded)}</p>
                    </div>
                  )}
                  {raffle.stats.pending > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-muted">Pendentes</p>
                      <p className="font-semibold text-amber-300 tabular-nums">{raffle.stats.pending}</p>
                    </div>
                  )}
                  <span className="text-muted text-sm group-hover:text-gold-soft transition-colors">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
