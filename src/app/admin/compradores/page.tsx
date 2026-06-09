import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminCompradoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page: rawPage } = await searchParams;
  const PAGE_SIZE = 50;
  const page = Math.max(1, parseInt(rawPage ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;
  const trimmed = q.trim();

  const admin = createSupabaseAdminClient();

  let query = admin
    .from("profiles")
    .select("id, full_name, cpf_last4, phone, created_at, is_banned, role", { count: "exact" })
    .eq("role", "buyer")
    .order("created_at", { ascending: false });

  if (trimmed) query = query.ilike("full_name", `%${trimmed}%`);

  const { data: profiles, count } = await query.range(offset, offset + PAGE_SIZE - 1);
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Emails via service_role function
  const ids = (profiles ?? []).map((p) => p.id);
  const emailMap = new Map<string, string>();
  if (ids.length) {
    const { data: emailRows } = await admin.rpc("get_buyer_emails", { buyer_ids: ids }) as {
      data: { id: string; email: string }[] | null;
    };
    for (const r of emailRows ?? []) emailMap.set(r.id, r.email);
  }

  // Per-buyer purchase counts
  const { data: purchaseCounts } = await admin
    .from("compras")
    .select("buyer_id, status, total_cents")
    .in("buyer_id", ids);

  const statsMap = new Map<string, { total: number; paidCents: number }>();
  for (const c of purchaseCounts ?? []) {
    const s = statsMap.get(c.buyer_id) ?? { total: 0, paidCents: 0 };
    s.total++;
    if (c.status === "paid") s.paidCents += c.total_cents ?? 0;
    statsMap.set(c.buyer_id, s);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Compradores</h1>
          <p className="text-muted text-sm mt-1">{count ?? 0} compradores cadastrados</p>
        </div>
        <Link href="/admin" className="text-sm text-muted hover:text-foreground transition-colors">
          ← Painel
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={trimmed}
          placeholder="Buscar por nome..."
          className="flex-1 rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60 transition-colors"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-md border border-border text-sm text-muted hover:border-gold/40 hover:text-foreground transition-colors"
        >
          Buscar
        </button>
        {trimmed && (
          <Link
            href="/admin/compradores"
            className="px-4 py-2.5 rounded-md border border-border text-sm text-muted hover:text-foreground transition-colors"
          >
            Limpar
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {(profiles ?? []).length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">Nenhum comprador encontrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-medium px-5 py-3">Comprador</th>
                <th className="text-left font-medium px-5 py-3 hidden sm:table-cell">CPF final</th>
                <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Compras</th>
                <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Total gasto</th>
                <th className="text-left font-medium px-5 py-3 hidden lg:table-cell">Cadastro</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((p) => {
                const email = emailMap.get(p.id) ?? null;
                const stats = statsMap.get(p.id) ?? { total: 0, paidCents: 0 };
                return (
                  <tr key={p.id} className={`border-t border-border hover:bg-surface-2/40 transition-colors ${p.is_banned ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3">
                      <p className="font-medium">{p.full_name}</p>
                      {email && <p className="text-xs text-muted">{email}</p>}
                      {p.is_banned && <span className="text-xs text-red-400">Banido</span>}
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell text-muted font-mono text-xs">
                      ···{p.cpf_last4}
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-muted">
                      {stats.total}
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell font-medium">
                      {stats.paidCents > 0
                        ? (stats.paidCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : "—"}
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-muted text-xs">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/compradores/${p.id}`}
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
            <Link href={`/admin/compradores?${trimmed ? `q=${trimmed}&` : ""}page=${page - 1}`}
              className="px-3 py-1.5 rounded-md border border-border text-muted hover:border-gold/40 hover:text-foreground transition-colors">
              ← Anterior
            </Link>
          )}
          <span className="px-3 py-1.5 text-muted">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={`/admin/compradores?${trimmed ? `q=${trimmed}&` : ""}page=${page + 1}`}
              className="px-3 py-1.5 rounded-md border border-border text-muted hover:border-gold/40 hover:text-foreground transition-colors">
              Próxima →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
