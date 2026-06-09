import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { RefundForm } from "./refund-form";

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Aguardando pagamento",
  paid: "Pago",
  cancelled: "Cancelado",
  refunded: "Estornado",
  expired: "Expirado",
};
const STATUS_COLOR: Record<string, string> = {
  paid: "text-emerald-300 border-emerald-400/40",
  pending_payment: "text-amber-300 border-amber-400/40",
  refunded: "text-blue-300 border-blue-400/40",
  cancelled: "text-red-400 border-red-400/40",
  expired: "text-muted border-border",
};

export default async function AdminCompraDetailPage({
  params,
}: {
  params: Promise<{ compraId: string }>;
}) {
  const { compraId } = await params;
  const admin = createSupabaseAdminClient();

  const { data: compra } = await admin
    .from("compras")
    .select(`
      id, status, quantity, unit_price_cents, total_cents, created_at,
      raffles(title, slug, cota_price_cents),
      profiles!compras_buyer_id_fkey(full_name, email:id),
      pagamentos(gateway_payment_id, status, amount_cents, pix_expiration)
    `)
    .eq("id", compraId)
    .maybeSingle();

  if (!compra) notFound();

  const raffle = Array.isArray(compra.raffles) ? compra.raffles[0] : compra.raffles as { title: string; slug: string } | null;
  const profile = Array.isArray(compra.profiles) ? compra.profiles[0] : compra.profiles as { full_name?: string } | null;
  const pagamento = Array.isArray(compra.pagamentos) ? compra.pagamentos[0] : compra.pagamentos as { gateway_payment_id?: string; status?: string; amount_cents?: number } | null;

  const canRefund = compra.status === "paid";

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2.5 py-0.5 rounded-full border ${STATUS_COLOR[compra.status] ?? "border-border text-muted"}`}>
              {STATUS_LABEL[compra.status] ?? compra.status}
            </span>
          </div>
          <h1 className="text-xl font-semibold">Compra #{compraId.slice(0, 8).toUpperCase()}</h1>
        </div>
        <Link href="/admin/compras" className="text-sm text-muted hover:text-foreground transition-colors">
          ← Compras
        </Link>
      </div>

      {/* Details */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-3 text-sm">
        <h2 className="font-semibold">Detalhes</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-muted">
          <div>
            <span className="text-foreground font-medium">Seleção:</span>{" "}
            {raffle ? <Link href={`/admin/selecoes/${(compra.raffles as { id?: string })}`} className="hover:text-gold-soft">{raffle.title}</Link> : "—"}
          </div>
          <div><span className="text-foreground font-medium">Comprador:</span> {profile?.full_name ?? "—"}</div>
          <div><span className="text-foreground font-medium">Quantidade:</span> {compra.quantity} cotas</div>
          <div>
            <span className="text-foreground font-medium">Total:</span>{" "}
            {(compra.total_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
          <div>
            <span className="text-foreground font-medium">Data:</span>{" "}
            {new Date(compra.created_at).toLocaleString("pt-BR")}
          </div>
          {pagamento?.gateway_payment_id && (
            <div>
              <span className="text-foreground font-medium">ID MP:</span>{" "}
              <span className="font-mono text-xs">{pagamento.gateway_payment_id}</span>
            </div>
          )}
        </div>
      </div>

      {/* Refund */}
      {canRefund && (
        <RefundForm compraId={compraId} totalCents={compra.total_cents} />
      )}

      {compra.status === "refunded" && (
        <div className="rounded-xl border border-blue-400/30 bg-blue-400/5 px-5 py-4 text-center">
          <p className="text-blue-300 font-medium">Esta compra foi estornada.</p>
        </div>
      )}
    </div>
  );
}
