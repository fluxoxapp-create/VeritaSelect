import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchPayment, MercadoPagoApiError } from "@/lib/payments/mercadopago";
import { CheckoutStatus } from "./checkout-status";

type CompraRow = {
  id: string;
  status: string;
  quantity: number;
  total_cents: number;
  raffle: { slug: string; title: string } | { slug: string; title: string }[] | null;
};

type PagamentoRow = {
  id: string;
  gateway_payment_id: string;
  status: string;
  pix_qr_code: string | null;
  pix_expiration: string | null;
};

function single<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function CheckoutStatusPage({
  params,
}: {
  params: Promise<{ slug: string; compraId: string }>;
}) {
  const { slug, compraId } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/entrar?next=${encodeURIComponent(`/sorteio/${slug}/comprar/${compraId}`)}`);
  }

  // RLS-scoped: the buyer can only ever see their own compra/pagamento rows.
  const { data: compra } = await supabase
    .from("compras")
    .select("id, status, quantity, total_cents, raffle:raffles(slug, title)")
    .eq("id", compraId)
    .maybeSingle<CompraRow>();

  if (!compra) notFound();

  const raffle = single(compra.raffle);
  if (!raffle || raffle.slug !== slug) notFound();

  const [{ data: pagamento }, { data: reservation }] = await Promise.all([
    supabase
      .from("pagamentos")
      .select("id, gateway_payment_id, status, pix_qr_code, pix_expiration")
      .eq("compra_id", compra.id)
      .order("created_at", { ascending: false })
      .maybeSingle<PagamentoRow>(),
    supabase
      .from("raffle_numbers")
      .select("reserved_until")
      .eq("purchase_id", compra.id)
      .not("reserved_until", "is", null)
      .order("reserved_until", { ascending: true })
      .limit(1)
      .maybeSingle<{ reserved_until: string | null }>(),
  ]);

  // Fetch a fresh QR (base64 image + current status) directly from Mercado
  // Pago for display — never persisted server-side as a large blob, and this
  // also gives us a live status read in case the webhook hasn't landed yet.
  let qrCodeBase64: string | null = null;
  let liveStatus: string | null = null;
  if (pagamento && (pagamento.status === "created" || pagamento.status === "pending")) {
    try {
      const live = await fetchPayment(pagamento.gateway_payment_id);
      qrCodeBase64 = live.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;
      liveStatus = live.status;
    } catch (err) {
      // Mercado Pago lookup failed (e.g. credentials not yet configured, or
      // transient outage) — degrade gracefully: show the copia-e-cola string
      // we already stored, and let client-side polling retry the live check.
      if (!(err instanceof MercadoPagoApiError)) {
        // Unexpected — surface nothing sensitive, just continue without the QR image.
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-14">
      <nav className="flex items-center gap-2 text-sm text-muted mb-6">
        <Link href={`/sorteio/${slug}`} className="hover:text-foreground transition-colors">
          {raffle.title}
        </Link>
        <span>/</span>
        <span className="text-foreground">Pagamento</span>
      </nav>

      <CheckoutStatus
        compraId={compra.id}
        slug={slug}
        raffleTitle={raffle.title}
        quantity={compra.quantity}
        totalCents={compra.total_cents}
        purchaseStatus={compra.status}
        paymentStatus={liveStatus ?? pagamento?.status ?? null}
        pixCopiaECola={pagamento?.pix_qr_code ?? null}
        qrCodeBase64={qrCodeBase64}
        reservedUntilIso={reservation?.reserved_until ?? null}
      />
    </div>
  );
}
