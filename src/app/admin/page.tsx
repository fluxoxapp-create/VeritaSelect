import Link from "next/link";
import { logoutAdmin } from "./actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminPage() {
  const supabase = createSupabaseAdminClient();

  const [
    { count: pendingOrganizers },
    { count: pendingRaffles },
    { count: totalUsers },
    { count: totalOrganizers },
    { count: totalPublished },
    { count: totalPaused },
    { count: totalCompleted },
    { data: recentPurchases },
    { data: allRaffles },
  ] = await Promise.all([
    supabase.from("organizers").select("id", { count: "exact", head: true }).eq("kyc_status", "pending"),
    supabase.from("raffles").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("organizers").select("id", { count: "exact", head: true }).eq("kyc_status", "approved"),
    supabase.from("raffles").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("raffles").select("id", { count: "exact", head: true }).eq("status", "paused"),
    supabase.from("raffles").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("compras")
      .select("id, buyer_id, quantity, total_cents, status, created_at, profiles!compras_buyer_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("raffles")
      .select("id, slug, title, status, total_cotas, draw_date, organizers!raffles_organizer_id_fkey(display_name)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  // Buyer emails for recent purchases
  const buyerIds = [...new Set((recentPurchases ?? []).map((p) => (p as { buyer_id: string }).buyer_id).filter(Boolean))];
  const emailMap = new Map<string, string>();
  if (buyerIds.length) {
    const { data: emailRows } = await supabase.rpc("get_buyer_emails", { buyer_ids: buyerIds }) as {
      data: { id: string; email: string }[] | null;
    };
    for (const row of emailRows ?? []) emailMap.set(row.id, row.email);
  }

  // Revenue from paid compras
  const { data: revenueData } = await supabase
    .from("compras")
    .select("total_cents")
    .eq("status", "paid");
  const totalRevenueCents = (revenueData ?? []).reduce((acc, r) => acc + (r.total_cents ?? 0), 0);

  const QUEUES = [
    { label: "Organizadores aguardando aprovação", value: pendingOrganizers ?? 0, href: "/admin/organizadores", urgent: (pendingOrganizers ?? 0) > 0 },
    { label: "Seleções aguardando validação", value: pendingRaffles ?? 0, href: "/admin/selecoes", urgent: (pendingRaffles ?? 0) > 0 },
  ];

  const STATUS_LABEL: Record<string, string> = {
    draft: "Rascunho", pending_review: "Em análise", published: "Publicada",
    paused: "Pausada", drawing: "Em apuração", completed: "Concluída", cancelled: "Cancelada",
  };
  const STATUS_COLOR: Record<string, string> = {
    draft: "text-muted border-border",
    pending_review: "text-amber-300 border-amber-400/40",
    published: "text-emerald-300 border-emerald-400/40",
    paused: "text-amber-300 border-amber-400/40",
    drawing: "text-gold-soft border-gold/40",
    completed: "text-muted border-border",
    cancelled: "text-red-400 border-red-400/40",
  };

  const PURCHASE_STATUS_COLOR: Record<string, string> = {
    paid: "text-emerald-300",
    pending_payment: "text-amber-300",
    cancelled: "text-muted",
    refunded: "text-red-400",
  };

  function org(row: unknown): string {
    const r = row as { organizers?: { display_name?: string } | { display_name?: string }[] | null };
    const o = Array.isArray(r?.organizers) ? r.organizers[0] : r?.organizers;
    return o?.display_name ?? "—";
  }

  function buyer(row: unknown): string {
    const r = row as { profiles?: { full_name?: string } | { full_name?: string }[] | null };
    const p = Array.isArray(r?.profiles) ? r.profiles[0] : r?.profiles;
    return p?.full_name ?? "—";
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Painel administrativo</h1>
          <p className="text-muted text-sm mt-1">VeritaSelect — visão completa da plataforma</p>
        </div>
        <form action={logoutAdmin}>
          <button type="submit" className="text-sm px-4 py-2 rounded-md border border-border text-muted hover:border-gold/60 hover:text-foreground transition-colors">
            Sair
          </button>
        </form>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Usuários", value: (totalUsers ?? 0).toLocaleString("pt-BR") },
          { label: "Organizadores", value: (totalOrganizers ?? 0).toLocaleString("pt-BR") },
          { label: "Seleções publicadas", value: (totalPublished ?? 0).toLocaleString("pt-BR") },
          { label: "Pausadas", value: (totalPaused ?? 0).toLocaleString("pt-BR") },
          { label: "Concluídas", value: (totalCompleted ?? 0).toLocaleString("pt-BR") },
          {
            label: "Receita confirmada",
            value: (totalRevenueCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
          },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted mb-1">{kpi.label}</p>
            <p className="text-lg font-semibold truncate">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Action queues */}
      <div className="grid sm:grid-cols-2 gap-3">
        {QUEUES.map((q) => (
          <Link
            key={q.label}
            href={q.href}
            className={`rounded-xl border p-5 hover:border-gold/40 transition-colors ${q.urgent ? "border-amber-400/40 bg-amber-400/5" : "border-border bg-surface"}`}
          >
            <p className="text-xs text-muted uppercase tracking-wide">{q.label}</p>
            <p className={`text-3xl font-semibold mt-2 ${q.urgent ? "text-amber-300" : ""}`}>{q.value}</p>
            {q.urgent && <p className="text-xs text-amber-400 mt-1">Aguardando revisão</p>}
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Organizadores", href: "/admin/organizadores" },
          { label: "Seleções", href: "/admin/selecoes" },
          { label: "Categorias", href: "/admin/categorias" },
          { label: "💳 Compras", href: "/admin/compras" },
        ].map((l) => (
          <Link key={l.label} href={l.href} className="px-4 py-2 text-sm rounded-md border border-border bg-surface hover:border-gold/40 transition-colors">
            {l.label} →
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* All raffles curadoria */}
        <div className="space-y-3">
          <h2 className="font-semibold">Curadoria de seleções</h2>
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Seleção</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-left font-medium px-4 py-3">Apuração</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(allRaffles ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium truncate max-w-[180px]">{r.title}</p>
                      <p className="text-xs text-muted truncate">{org(r)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[r.status] ?? "text-muted border-border"}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {r.draw_date ? new Date(r.draw_date).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/selecoes/${r.id}`} className="text-xs text-muted hover:text-foreground transition-colors">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
                {(allRaffles ?? []).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">Nenhuma seleção ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent purchases */}
        <div className="space-y-3">
          <h2 className="font-semibold">Compras recentes</h2>
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Comprador</th>
                  <th className="text-left font-medium px-4 py-3">Valor</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-left font-medium px-4 py-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {(recentPurchases ?? []).map((p) => {
                  const bp = p as { buyer_id: string };
                  const email = emailMap.get(bp.buyer_id) ?? null;
                  return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-3 max-w-[160px]">
                      <p className="truncate font-medium">{buyer(p)}</p>
                      {email && <p className="truncate text-xs text-muted">{email}</p>}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {((p.total_cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      <span className="text-muted text-xs ml-1">({p.quantity}x)</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${PURCHASE_STATUS_COLOR[p.status] ?? "text-muted"}`}>
                        {p.status === "paid" ? "Pago" : p.status === "pending_payment" ? "Pendente" : p.status === "cancelled" ? "Cancelado" : p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                  );
                })}
                {(recentPurchases ?? []).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">Nenhuma compra ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
