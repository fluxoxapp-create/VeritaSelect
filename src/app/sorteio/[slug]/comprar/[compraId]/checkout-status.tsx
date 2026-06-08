"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  compraId: string;
  slug: string;
  raffleTitle: string;
  quantity: number;
  totalCents: number;
  /** compra.status — pending_payment | paid | expired | cancelled | refunded | fraud_review */
  purchaseStatus: string;
  /** latest known pagamento status (live-checked when possible) */
  paymentStatus: string | null;
  pixCopiaECola: string | null;
  qrCodeBase64: string | null;
  /** ISO timestamp for when the number reservation lapses */
  reservedUntilIso: string | null;
};

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function useCountdown(targetIso: string | null) {
  const target = useMemo(() => (targetIso ? new Date(targetIso).getTime() : null), [targetIso]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return { expired: false, label: null as string | null };

  const remainingMs = target - now;
  if (remainingMs <= 0) return { expired: true, label: "00:00" };

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { expired: false, label: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` };
}

const TERMINAL_STATUSES = new Set(["paid", "expired", "cancelled", "refunded", "fraud_review"]);

export function CheckoutStatus(props: Props) {
  const router = useRouter();
  const { expired, label } = useCountdown(
    TERMINAL_STATUSES.has(props.purchaseStatus) ? null : props.reservedUntilIso,
  );
  const [copied, setCopied] = useState(false);

  // Poll the page (server-rendered) for status updates while the reservation
  // is alive — the webhook confirms payment asynchronously, and we want the
  // buyer to see "pago" the moment it lands without manual refresh. This is
  // a courtesy refresh; the *authoritative* state always lives server-side.
  useEffect(() => {
    if (props.purchaseStatus !== "pending_payment") return;
    if (expired) return;

    const id = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(id);
  }, [props.purchaseStatus, expired, router]);

  // Once the hold expires client-side, force one more refresh shortly after
  // so the server can reflect "expirada" (stale-release happens on next
  // reserve_raffle_numbers call or the cleanup cron — this just re-renders
  // with accurate data instead of a frozen "valid" QR).
  useEffect(() => {
    if (!expired) return;
    const id = setTimeout(() => router.refresh(), 1500);
    return () => clearTimeout(id);
  }, [expired, router]);

  async function copyPixCode() {
    if (!props.pixCopiaECola) return;
    try {
      await navigator.clipboard.writeText(props.pixCopiaECola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (older browsers / insecure context) — the
      // string is still selectable/visible in the textarea below.
    }
  }

  const isPaid = props.purchaseStatus === "paid" || props.paymentStatus === "approved";
  const isReservationDead =
    expired || ["expired", "cancelled", "refunded", "fraud_review"].includes(props.purchaseStatus);

  return (
    <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 space-y-6">
      <div>
        <p className="text-sm text-muted">Pedido</p>
        <h1 className="text-xl font-semibold">{props.raffleTitle}</h1>
        <p className="text-sm text-muted mt-1">
          {props.quantity} acesso{props.quantity > 1 ? "s" : ""} ·{" "}
          <span className="text-gold-soft font-medium">{formatBRL(props.totalCents)}</span>
        </p>
      </div>

      {isPaid && (
        <div className="rounded-lg border border-gold/40 bg-gold/10 p-5 text-center space-y-2">
          <p className="text-2xl">✓</p>
          <p className="font-semibold text-gold-soft">Pagamento confirmado</p>
          <p className="text-sm text-muted">
            Seus acessos já foram garantidos. Você pode conferir os números no seu painel.
          </p>
          <Link
            href="/dashboard/numeros"
            className="inline-block mt-2 px-5 py-2 rounded-md bg-gold text-background text-sm font-medium hover:bg-gold-soft transition-colors"
          >
            Ver meus números
          </Link>
        </div>
      )}

      {!isPaid && isReservationDead && (
        <div className="rounded-lg border border-border bg-surface-2 p-5 text-center space-y-2">
          <p className="font-semibold">Reserva expirada</p>
          <p className="text-sm text-muted">
            O tempo para pagamento deste pedido encerrou e os acessos voltaram para o estoque. Tente
            novamente para gerar um novo Pix.
          </p>
          <Link
            href={`/sorteio/${props.slug}`}
            className="inline-block mt-2 px-5 py-2 rounded-md bg-gold text-background text-sm font-medium hover:bg-gold-soft transition-colors"
          >
            Tentar novamente
          </Link>
        </div>
      )}

      {!isPaid && !isReservationDead && (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-4 py-3">
            <span className="text-sm text-muted">Pague em até</span>
            <span className="text-lg font-semibold text-gold-soft tabular-nums">{label ?? "—"}</span>
          </div>

          {props.qrCodeBase64 ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative h-56 w-56 rounded-lg overflow-hidden border border-border bg-white p-2">
                <Image
                  src={`data:image/png;base64,${props.qrCodeBase64}`}
                  alt="QR Code Pix"
                  fill
                  sizes="224px"
                  className="object-contain"
                  unoptimized
                />
              </div>
              <p className="text-xs text-muted">Escaneie com o app do seu banco</p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-surface-2 p-5 text-center text-sm text-muted">
              {props.pixCopiaECola
                ? "QR indisponível no momento — use o código copia-e-cola abaixo."
                : "Gerando QR Code Pix… atualize a página em instantes."}
            </div>
          )}

          {props.pixCopiaECola && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Pix copia e cola</p>
              <textarea
                readOnly
                value={props.pixCopiaECola}
                rows={3}
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-muted resize-none outline-none"
              />
              <button
                type="button"
                onClick={copyPixCode}
                className="w-full py-2.5 rounded-md border border-gold/60 bg-gold/10 text-gold-soft text-sm font-medium hover:bg-gold/20 transition-colors cursor-pointer"
              >
                {copied ? "Copiado!" : "Copiar código Pix"}
              </button>
            </div>
          )}

          <p className="text-xs text-muted text-center">
            Assim que o pagamento for confirmado pelo nosso sistema, esta página é atualizada
            automaticamente — não é necessário recarregar.
          </p>
        </div>
      )}
    </div>
  );
}
