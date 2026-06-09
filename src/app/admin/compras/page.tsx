import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Aguardando", paid: "Pago", cancelled: "Cancelado",
  refunded: "Estornado", expired: "Expirado",
};
const STATUS_COLOR: Record<string, string> = {
  paid: "text-emerald-300 border-emerald-400/40",
  pending_payment: "text-amber-300 border-amber-400/40",
  refunded: "text-blue-300 border-blue-400/40",
  cancelled: "text-red-400 border-red-400/40",
  expired: "text-muted border-border",
};

const VALID_FILTERS = ["all", "paid", "pending_payment", "refunded", "cancelled"] as const;
type Filter = (typeof VALID_FILTERS)[number];

export default async function AdminComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status: rawStatus, page: rawPage } = await searchParams;
  const filter: Filter = VALID_FILTERS.includes(rawStatus as Filter) ? (rawStatus as Filter) : "all";
  const page = Math.max(1, parseInt(rawPage ?? "1", 10));
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const admin = createSupabaseAdminClient();

  let query = admin
    .from("compras")
    .select(`
      id, status, quantity, total_cents, created_at,
      raffles(title),
      profiles!compras_buyer_id_fkey(full_name)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filter !== "all") query = query.eq("status", filter);

  const { data: rows, count } = await query;
  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Summary totals
  const { data: summary } = await admin
    .from("compras")
    .select("status, total_cents");

  const paid = (summary ?? []).filter((r) => r.status === "paid").reduce((a, r) => a + (r.total_cents ?? 0), 0);
  const refunded = (summary ?? []).filter((r) => r.status === "refunded").reduce((a, r) => a + (r.total_cents ?? 0), 0);
  const pending = (summary ?? []).filter((r) => r.status === "pending_payment").length;

  const fmtBrl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Compras</h1>
          <p className="text-muted text-sm mt-1">Área financeira — todas as transações da plataforma.</p>
        </div>
        <Link href="/admin" className="text-sm text-muted hover:text-foreground transition-colors">
          ← Painel
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Receita confirmada", value: fmtBrl(paid), color: "text-emerald-300" },
          { label: "Estornos", value: fmtBrl(refunded), color: "text-blue-300" },
          { label: "Aguardando pagamento", value: String(pending), color: "text-amber-300" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">{k.label}</p>
            <p className={`text-lg font-semibold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap text-sm">
        {(["all", "paid", "pending_payment", "refunded", "cancelled"] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/compras${s === "all" ? "" : `?status=${s}`}`}
            className={`px-3 py-1.5 rounded-md border transition-colors ${
              filter === s
                ? "border-gold/60 bg-gold/10 text-gold-soft"
                : "border-border text-muted hover:border-gold/40 hover:text-foreground"
            }`}
          >
            {s === "all" ? "Todas" : STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {(rows ?? []).length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">Nenhuma compra encontrada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-medium px-5 py-3">ID</th>
                <th className="text-left font-medium px-5 py-3 hidden sm:table-cell">Comprador</th>
                <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Seleção</th>
                <th className="text-left font-medium px-5 py-3">Valor</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
                <th className="text-left font-medium px-5 py-3 hidden sm:table-cell">Data</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((row) => {
                const raffle = Array.isArray(row.raffles) ? row.raffles[0] : row.raffles as { title?: string } | null;
                const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles as { full_name?: string } | null;
                return (
                  <tr key={row.id} className="border-t border-border hover:bg-surface-2/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-muted">{row.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-5 py-3 hidden sm:table-cell">{profile?.full_name ?? "—"}</td>
                    <td className="px-5 py-3 hidden md:table-cell text-muted truncate max-w-[200px]">{raffle?.title ?? "—"}</td>
                    <td className="px-5 py-3 font-medium">{fmtBrl(row.total_cents)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[row.status] ?? "border-border text-muted"}`}>
                        {STATUS_LABEL[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell text-muted text-xs">
                      {new Date(row.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/compras/${row.id}`}
                        className="text-xs text-muted hover:text-gold-soft transition-colors"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 text-sm">
          {page > 1 && (
            <Link href={`/admin/compras?${filter !== "all" ? `status=${filter}&` : ""}page=${page - 1}`}
              className="px-3 py-1.5 rounded-md border border-border text-muted hover:border-gold/40 hover:text-foreground transition-colors">
              ← Anterior
            </Link>
          )}
          <span className="px-3 py-1.5 text-muted">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/admin/compras?${filter !== "all" ? `status=${filter}&` : ""}page=${page + 1}`}
              className="px-3 py-1.5 rounded-md border border-border text-muted hover:border-gold/40 hover:text-foreground transition-colors">
              Próxima →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
