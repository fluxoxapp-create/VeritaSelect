import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SearchFilter } from "./search-filter";
import { BulkRefundForm } from "./bulk-refund-form";
import { RowRefundForm } from "./row-refund-form";

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

const VALID_STATUS = ["paid", "pending_payment", "refunded", "cancelled", "expired"];
const PAGE_SIZE = 50;

function formatNumbers(nums: number[]): string {
  if (!nums.length) return "—";
  const s = [...nums].sort((a, b) => a - b);
  if (s.length <= 5) return s.map((n) => String(n).padStart(3, "0")).join(", ");
  return `${String(s[0]).padStart(3, "0")}–${String(s[s.length - 1]).padStart(3, "0")} (${s.length})`;
}

const fmtBrl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function RaffleComprasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { id: raffleId } = await params;
  const { q = "", status: rawStatus, page: rawPage } = await searchParams;
  const statusFilter = VALID_STATUS.includes(rawStatus ?? "") ? rawStatus! : null;
  const page = Math.max(1, parseInt(rawPage ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const admin = createSupabaseAdminClient();

  // Load raffle + organizer info
  const { data: raffle } = await admin
    .from("raffles")
    .select("id, title, status, total_cotas, created_at, draw_date, organizers(display_name)")
    .eq("id", raffleId)
    .maybeSingle() as {
      data: {
        id: string; title: string; status: string; total_cotas: number;
        created_at: string; draw_date: string;
        organizers: { display_name: string } | { display_name: string }[] | null;
      } | null;
    };

  if (!raffle) notFound();

  const organizerName = (() => {
    if (!raffle.organizers) return "—";
    return (Array.isArray(raffle.organizers) ? raffle.organizers[0] : raffle.organizers).display_name;
  })();

  // ── Search: resolve matching compra IDs ─────────────────────────────────
  const trimmed = q.trim();
  let filteredIds: string[] | null = null;

  if (trimmed) {
    const isNumeric = /^\d+$/.test(trimmed);
    if (isNumeric) {
      const { data: numRows } = await admin
        .from("raffle_numbers")
        .select("purchase_id")
        .eq("raffle_id", raffleId)
        .eq("number", parseInt(trimmed, 10))
        .not("purchase_id", "is", null);
      filteredIds = (numRows ?? []).map((r) => r.purchase_id as string).filter(Boolean);
    } else {
      // Search by buyer name
      const { data: profileRows } = await admin
        .from("profiles")
        .select("id")
        .ilike("full_name", `%${trimmed}%`);
      const profileIds = (profileRows ?? []).map((p) => p.id);

      let byName: string[] = [];
      if (profileIds.length) {
        const { data: nameMatches } = await admin
          .from("compras")
          .select("id")
          .eq("raffle_id", raffleId)
          .in("buyer_id", profileIds);
        byName = (nameMatches ?? []).map((c) => c.id);
      }

      // Also search by purchase ID prefix
      let byId: string[] = [];
      if (/^[0-9a-fA-F-]+$/.test(trimmed)) {
        const { data: idMatches } = await admin
          .from("compras")
          .select("id")
          .eq("raffle_id", raffleId)
          .ilike("id", `${trimmed}%`);
        byId = (idMatches ?? []).map((c) => c.id);
      }

      filteredIds = [...new Set([...byName, ...byId])];
    }
  }

  // ── Main compras query ───────────────────────────────────────────────────
  type CompraRow = {
    id: string; buyer_id: string; status: string;
    quantity: number; total_cents: number; created_at: string;
    profiles: { full_name?: string } | { full_name?: string }[] | null;
  };

  let query = admin
    .from("compras")
    .select("id, buyer_id, status, quantity, total_cents, created_at, profiles!compras_buyer_id_fkey(full_name)", { count: "exact" })
    .eq("raffle_id", raffleId)
    .order("created_at", { ascending: false });

  if (statusFilter) query = query.eq("status", statusFilter);

  if (filteredIds !== null) {
    const ids = filteredIds.length ? filteredIds : ["00000000-0000-0000-0000-000000000000"];
    query = query.in("id", ids);
  }

  const { data: comprasRaw, count } = await query.range(offset, offset + PAGE_SIZE - 1);
  const compras = (comprasRaw ?? []) as CompraRow[];
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // ── Fetch buyer emails via SECURITY DEFINER function ────────────────────
  const buyerIds = [...new Set(compras.map((c) => c.buyer_id))];
  const emailMap = new Map<string, string>();
  if (buyerIds.length) {
    const { data: emailRows } = await admin.rpc("get_buyer_emails", { buyer_ids: buyerIds }) as {
      data: { id: string; email: string }[] | null;
    };
    for (const row of emailRows ?? []) {
      emailMap.set(row.id, row.email);
    }
  }

  // ── Load cota numbers for this page ─────────────────────────────────────
  const compraIds = compras.map((c) => c.id);
  const { data: numbersData } = compraIds.length
    ? await admin
        .from("raffle_numbers")
        .select("number, purchase_id")
        .eq("raffle_id", raffleId)
        .in("purchase_id", compraIds)
    : { data: [] };

  const numbersByPurchase = new Map<string, number[]>();
  for (const r of numbersData ?? []) {
    if (!r.purchase_id) continue;
    const arr = numbersByPurchase.get(r.purchase_id) ?? [];
    arr.push(r.number);
    numbersByPurchase.set(r.purchase_id, arr);
  }

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const { data: allCompras } = await admin
    .from("compras")
    .select("status, total_cents")
    .eq("raffle_id", raffleId);

  const paidRows = (allCompras ?? []).filter((c) => c.status === "paid");
  const paidCount = paidRows.length;
  const totalRevenue = paidRows.reduce((a, c) => a + (c.total_cents ?? 0), 0);
  const refundedCents = (allCompras ?? [])
    .filter((c) => c.status === "refunded")
    .reduce((a, c) => a + (c.total_cents ?? 0), 0);
  const pendingCount = (allCompras ?? []).filter((c) => c.status === "pending_payment").length;

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    if (statusFilter) params.set("status", statusFilter);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs text-muted">Compras por seleção</p>
          <h1 className="text-2xl font-semibold">{raffle.title}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span>Organizador: <span className="text-foreground">{organizerName}</span></span>
            <span>Criada em: <span className="text-foreground">{new Date(raffle.created_at).toLocaleDateString("pt-BR")}</span></span>
            <span>Apuração: <span className="text-foreground">{new Date(raffle.draw_date).toLocaleDateString("pt-BR")}</span></span>
            <span>Total de cotas: <span className="text-foreground">{raffle.total_cotas.toLocaleString("pt-BR")}</span></span>
          </div>
        </div>
        <Link
          href="/admin/compras"
          className="text-sm text-muted hover:text-foreground transition-colors shrink-0"
        >
          ← Compras
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Receita confirmada", value: fmtBrl(totalRevenue), color: "text-emerald-300" },
          { label: "Estornos realizados", value: fmtBrl(refundedCents), color: "text-blue-300" },
          { label: "Compras pagas", value: String(paidCount), color: "text-emerald-300" },
          { label: "Aguardando pagamento", value: String(pendingCount), color: "text-amber-300" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">{k.label}</p>
            <p className={`text-lg font-semibold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Bulk refund */}
      <BulkRefundForm raffleId={raffleId} raffleTitle={raffle.title} paidCount={paidCount} />

      {/* Search & filter */}
      <Suspense>
        <SearchFilter currentQ={trimmed} currentStatus={rawStatus ?? "all"} />
      </Suspense>

      {trimmed && (
        <p className="text-sm text-muted">
          {count ?? 0} resultado{(count ?? 0) !== 1 ? "s" : ""} para &ldquo;{trimmed}&rdquo;
        </p>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {compras.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">Nenhuma compra encontrada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-medium px-5 py-3">ID</th>
                <th className="text-left font-medium px-5 py-3">Comprador</th>
                <th className="text-left font-medium px-5 py-3 hidden lg:table-cell">Cotas</th>
                <th className="text-left font-medium px-5 py-3">Valor</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
                <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Data</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {compras.map((row) => {
                const profile = (
                  Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
                ) as { full_name?: string } | null;
                const email = emailMap.get(row.buyer_id) ?? null;
                const numbers = numbersByPurchase.get(row.id) ?? [];
                return (
                  <tr key={row.id} className="border-t border-border align-middle hover:bg-surface-2/40 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-muted whitespace-nowrap">
                      {row.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium truncate max-w-[180px]">
                        {profile?.full_name ?? "—"}
                      </p>
                      {email && (
                        <p className="text-xs text-muted truncate max-w-[180px]">{email}</p>
                      )}
                      <p className="text-xs text-muted/60">{row.quantity} cota{row.quantity !== 1 ? "s" : ""}</p>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-muted text-xs font-mono">
                      {formatNumbers(numbers)}
                    </td>
                    <td className="px-5 py-3 font-medium whitespace-nowrap">{fmtBrl(row.total_cents)}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[row.status] ?? "border-border text-muted"}`}
                      >
                        {STATUS_LABEL[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-muted text-xs whitespace-nowrap">
                      {new Date(row.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-3">
                        {row.status === "paid" && (
                          <RowRefundForm
                            compraId={row.id}
                            raffleId={raffleId}
                            totalCents={row.total_cents}
                            buyerName={profile?.full_name ?? "comprador"}
                          />
                        )}
                        <Link
                          href={`/admin/compras/${row.id}`}
                          className="text-xs text-muted hover:text-gold-soft transition-colors whitespace-nowrap"
                        >
                          Ver →
                        </Link>
                      </div>
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
            <Link href={pageUrl(page - 1)} className="px-3 py-1.5 rounded-md border border-border text-muted hover:border-gold/40 hover:text-foreground transition-colors">
              ← Anterior
            </Link>
          )}
          <span className="px-3 py-1.5 text-muted">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={pageUrl(page + 1)} className="px-3 py-1.5 rounded-md border border-border text-muted hover:border-gold/40 hover:text-foreground transition-colors">
              Próxima →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
