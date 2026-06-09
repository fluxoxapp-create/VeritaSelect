import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { approveRaffle } from "../actions";
import { RejectForm } from "../reject-form";
import { pauseRaffle, resumeRaffle, cancelRaffle, startDrawing } from "./actions";
import { DrawResultForm } from "./draw-result-form";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho", pending_review: "Em análise", published: "Publicada",
  paused: "Pausada", drawing: "Em apuração", completed: "Concluída", cancelled: "Cancelada",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "text-muted border-border", pending_review: "text-amber-300 border-amber-400/40",
  published: "text-emerald-300 border-emerald-400/40", paused: "text-amber-300 border-amber-400/40",
  drawing: "text-gold-soft border-gold/40", completed: "text-muted border-border", cancelled: "text-red-400 border-red-400/40",
};

export default async function AdminSelecaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const [{ data: raffle }, { data: prizes }, { data: winner }, { data: salesData }] = await Promise.all([
    supabase.from("raffles")
      .select("id, slug, title, category, description, status, cota_price_cents, total_cotas, draw_date, draw_method, lottery_result_number, lottery_concurso, winning_cota_number, created_at, organizers!raffles_organizer_id_fkey(display_name, is_verified)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("raffle_prizes")
      .select("id, prize_number, prize_description, reveal_at_pct, is_revealed, winner_buyer_id")
      .eq("raffle_id", id)
      .order("prize_number"),
    supabase.from("ganhadores")
      .select("id, drawn_number, drawn_at, profiles!ganhadores_buyer_id_fkey(full_name, cpf_last4)")
      .eq("raffle_id", id)
      .maybeSingle(),
    supabase.from("compras")
      .select("status, total_cents")
      .eq("raffle_id", id),
  ]);

  if (!raffle) notFound();

  const sales = (salesData ?? []);
  const paidCount = sales.filter((s) => s.status === "paid").length;
  const pendingCount = sales.filter((s) => s.status === "pending_payment").length;
  const totalRevenue = sales.filter((s) => s.status === "paid").reduce((acc, s) => acc + (s.total_cents ?? 0), 0);
  const pct = raffle.total_cotas > 0 ? Math.min(100, Math.round((paidCount / raffle.total_cotas) * 100)) : 0;

  function org(): string {
    const o = Array.isArray(raffle!.organizers) ? raffle!.organizers[0] : raffle!.organizers;
    return (o as { display_name?: string } | null)?.display_name ?? "—";
  }

  function winnerProfile() {
    if (!winner) return null;
    const p = Array.isArray((winner as { profiles?: unknown }).profiles) ? (winner as { profiles?: { full_name?: string; cpf_last4?: string }[] }).profiles?.[0] : (winner as { profiles?: { full_name?: string; cpf_last4?: string } | null }).profiles;
    return p ?? null;
  }

  const digits = raffle.total_cotas <= 100 ? 2 : raffle.total_cotas <= 1000 ? 3 : raffle.total_cotas <= 10000 ? 4 : 5;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className={`text-xs px-2.5 py-0.5 rounded-full border ${STATUS_COLOR[raffle.status] ?? ""}`}>
              {STATUS_LABEL[raffle.status] ?? raffle.status}
            </span>
            <span className="text-xs text-muted">{raffle.category}</span>
          </div>
          <h1 className="text-2xl font-semibold">{raffle.title}</h1>
          <p className="text-muted text-sm mt-1">Organizador: {org()}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={`/admin/selecoes/${id}/compras`}
            className="text-sm px-3 py-1.5 rounded-md border border-border text-muted hover:border-gold/40 hover:text-foreground transition-colors"
          >
            Compras →
          </Link>
          <Link href="/admin/selecoes" className="text-sm text-muted hover:text-foreground transition-colors">
            ← Seleções
          </Link>
        </div>
      </div>

      {/* Sales KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Cotas vendidas", value: `${paidCount.toLocaleString("pt-BR")} / ${raffle.total_cotas.toLocaleString("pt-BR")}` },
          { label: "Progresso", value: `${pct}%` },
          { label: "Pendentes", value: pendingCount.toLocaleString("pt-BR") },
          { label: "Receita confirmada", value: (totalRevenue / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">{k.label}</p>
            <p className="text-lg font-semibold mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-gold-soft to-gold rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-muted mt-1.5">
          {raffle.draw_method === "loteria_federal" ? "Loteria Federal" : "Sorteio ao vivo"} ·
          Apuração: {raffle.draw_date ? new Date(raffle.draw_date).toLocaleDateString("pt-BR") : "—"}
        </p>
      </div>

      {/* Raffle details */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-3 text-sm">
        <h2 className="font-semibold">Detalhes da seleção</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-muted">
          <div><span className="text-foreground font-medium">Valor da cota:</span> {(raffle.cota_price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
          <div><span className="text-foreground font-medium">Total de cotas:</span> {raffle.total_cotas.toLocaleString("pt-BR")}</div>
          <div><span className="text-foreground font-medium">Slug:</span> <span className="font-mono text-xs">{raffle.slug}</span></div>
          <div><span className="text-foreground font-medium">Criado em:</span> {new Date(raffle.created_at).toLocaleDateString("pt-BR")}</div>
        </div>
        <p className="text-muted border-t border-border pt-3">{raffle.description}</p>
      </div>

      {/* Winner */}
      {winner && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-5 space-y-2">
          <h2 className="font-semibold text-emerald-300">Ganhador do prêmio principal</h2>
          <p className="text-2xl font-mono font-bold text-emerald-300">
            {String(winner.drawn_number).padStart(digits, "0")}
          </p>
          {(() => { const wp = winnerProfile(); return wp ? (
            <p className="text-sm text-muted">{wp.full_name ?? "—"} · CPF ***{wp.cpf_last4}</p>
          ) : null; })()}
          {raffle.lottery_result_number && (
            <p className="text-xs text-muted">Resultado Loteria Federal: <span className="font-mono text-foreground">{raffle.lottery_result_number}</span> · Concurso {raffle.lottery_concurso}</p>
          )}
        </div>
      )}

      {/* Instant prizes */}
      {(prizes ?? []).length > 0 && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="px-5 py-3 border-b border-border font-semibold text-sm">Prêmios instantâneos ({(prizes ?? []).length})</div>
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-medium px-5 py-2">Nº</th>
                <th className="text-left font-medium px-5 py-2">Prêmio</th>
                <th className="text-left font-medium px-5 py-2">Revelação</th>
                <th className="text-left font-medium px-5 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(prizes ?? []).map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-5 py-2.5 font-mono">{String(p.prize_number).padStart(digits, "0")}</td>
                  <td className="px-5 py-2.5">{p.prize_description}</td>
                  <td className="px-5 py-2.5 text-muted text-xs">{p.reveal_at_pct === 0 ? "Imediato" : `${p.reveal_at_pct}%`}</td>
                  <td className="px-5 py-2.5">
                    {p.winner_buyer_id ? <span className="text-xs text-gold-soft">Premiado</span>
                      : p.is_revealed ? <span className="text-xs text-emerald-300">Revelado</span>
                      : <span className="text-xs text-muted">Oculto</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-3">
        <h2 className="font-semibold">Controles</h2>
        <div className="flex flex-wrap gap-2">
          {raffle.status === "pending_review" && (
            <>
              <form action={approveRaffle}>
                <input type="hidden" name="raffleId" value={raffle.id} />
                <button type="submit" className="px-4 py-2 text-sm rounded-md border border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10 transition-colors cursor-pointer">Aprovar seleção</button>
              </form>
              <RejectForm raffleId={raffle.id} />
            </>
          )}
          {raffle.status === "published" && (
            <>
              <form action={pauseRaffle.bind(null, raffle.id)}>
                <button type="submit" className="px-4 py-2 text-sm rounded-md border border-amber-400/40 text-amber-300 hover:bg-amber-400/10 transition-colors cursor-pointer">Pausar</button>
              </form>
              <form action={startDrawing.bind(null, raffle.id)}>
                <button type="submit" className="px-4 py-2 text-sm rounded-md border border-gold/40 text-gold-soft hover:bg-gold/10 transition-colors cursor-pointer">Iniciar apuração</button>
              </form>
            </>
          )}
          {raffle.status === "paused" && (
            <form action={resumeRaffle.bind(null, raffle.id)}>
              <button type="submit" className="px-4 py-2 text-sm rounded-md border border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10 transition-colors cursor-pointer">Retomar publicação</button>
            </form>
          )}
          {(raffle.status === "published" || raffle.status === "paused") && (
            <form action={cancelRaffle.bind(null, raffle.id)}>
              <button type="submit" className="px-4 py-2 text-sm rounded-md border border-red-400/40 text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer">Cancelar seleção</button>
            </form>
          )}
        </div>
      </div>

      {/* Draw result */}
      {(raffle.status === "drawing" || raffle.status === "published") && !winner && (
        <DrawResultForm raffleId={raffle.id} totalCotas={raffle.total_cotas} />
      )}
    </div>
  );
}
