import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PURCHASE_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Aguardando", paid: "Pago", cancelled: "Cancelado",
  refunded: "Estornado", expired: "Expirado",
};
const PURCHASE_STATUS_COLOR: Record<string, string> = {
  paid: "text-emerald-300 border-emerald-400/40",
  pending_payment: "text-amber-300 border-amber-400/40",
  refunded: "text-blue-300 border-blue-400/40",
  cancelled: "text-muted border-border",
  expired: "text-muted border-border",
};

const fmtBrl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function BuyerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, cpf_last4, phone, birth_date, created_at, is_banned, banned_reason, banned_at, role")
    .eq("id", id)
    .maybeSingle();

  if (!profile) notFound();

  // Email via service_role function
  const { data: emailRows } = await admin.rpc("get_buyer_emails", { buyer_ids: [id] }) as {
    data: { id: string; email: string }[] | null;
  };
  const email = emailRows?.[0]?.email ?? null;

  // All purchases
  const { data: compras } = await admin
    .from("compras")
    .select("id, status, quantity, total_cents, created_at, raffles(title, slug)")
    .eq("buyer_id", id)
    .order("created_at", { ascending: false });

  const paidCompras = (compras ?? []).filter((c) => c.status === "paid");
  const totalSpent = paidCompras.reduce((a, c) => a + (c.total_cents ?? 0), 0);
  const totalCotas = paidCompras.reduce((a, c) => a + (c.quantity ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted mb-1">Comprador</p>
          <h1 className="text-2xl font-semibold">{profile.full_name}</h1>
          {profile.is_banned && (
            <p className="text-sm text-red-400 mt-1">
              Banido{profile.banned_reason ? `: ${profile.banned_reason}` : ""}
            </p>
          )}
        </div>
        <Link href="/admin/compradores" className="text-sm text-muted hover:text-foreground transition-colors shrink-0">
          ← Compradores
        </Link>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Dados pessoais</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted mb-0.5">Nome completo</p>
            <p className="font-medium">{profile.full_name}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-0.5">E-mail</p>
            <p className="font-medium">{email ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-0.5">CPF (final)</p>
            <p className="font-mono">···{profile.cpf_last4}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-0.5">Telefone</p>
            <p>{profile.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-0.5">Data de nascimento</p>
            <p>{profile.birth_date ? new Date(profile.birth_date).toLocaleDateString("pt-BR") : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-0.5">Cadastro em</p>
            <p>{new Date(profile.created_at).toLocaleDateString("pt-BR")}</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total gasto", value: fmtBrl(totalSpent), color: "text-emerald-300" },
          { label: "Cotas compradas", value: String(totalCotas), color: "" },
          { label: "Compras realizadas", value: String((compras ?? []).length), color: "" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">{k.label}</p>
            <p className={`text-lg font-semibold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Purchase history */}
      <div className="space-y-3">
        <h2 className="font-semibold">Histórico de compras</h2>
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          {(compras ?? []).length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">Nenhuma compra realizada.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Seleção</th>
                  <th className="text-left font-medium px-5 py-3">Cotas</th>
                  <th className="text-left font-medium px-5 py-3">Valor</th>
                  <th className="text-left font-medium px-5 py-3">Status</th>
                  <th className="text-left font-medium px-5 py-3 hidden sm:table-cell">Data</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {(compras ?? []).map((c) => {
                  const raffle = (Array.isArray(c.raffles) ? c.raffles[0] : c.raffles) as { title?: string; slug?: string } | null;
                  return (
                    <tr key={c.id} className="border-t border-border hover:bg-surface-2/40 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium truncate max-w-[200px]">{raffle?.title ?? "—"}</p>
                        <p className="text-xs text-muted font-mono">{c.id.slice(0, 8).toUpperCase()}</p>
                      </td>
                      <td className="px-5 py-3 text-muted">{c.quantity}x</td>
                      <td className="px-5 py-3 font-medium">{fmtBrl(c.total_cents)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${PURCHASE_STATUS_COLOR[c.status] ?? "border-border text-muted"}`}>
                          {PURCHASE_STATUS_LABEL[c.status] ?? c.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell text-muted text-xs">
                        {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/admin/compras/${c.id}`}
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
      </div>
    </div>
  );
}
