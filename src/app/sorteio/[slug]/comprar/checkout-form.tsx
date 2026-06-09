"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { startCheckout, type CheckoutState } from "./actions";

const QUICK_OPTIONS = [5, 10, 25, 50];
const MAX_PER_PURCHASE = 500;

const initialState: CheckoutState = { status: "idle" };

export function CheckoutForm({
  slug,
  unitPriceCents,
  maxQuantity,
}: {
  slug: string;
  unitPriceCents: number;
  maxQuantity: number;
}) {
  const router = useRouter();
  const effectiveMax = Math.min(maxQuantity, MAX_PER_PURCHASE);
  const [quantity, setQuantity] = useState(() => Math.min(QUICK_OPTIONS[1] ?? 1, effectiveMax));
  const [state, formAction, pending] = useActionState(startCheckout, initialState);

  useEffect(() => {
    if (state.status === "success") {
      router.push(`/sorteio/${slug}/comprar/${state.compraId}`);
    }
  }, [state, router, slug]);

  const total = unitPriceCents * quantity;

  function clamp(value: number) {
    if (!Number.isFinite(value)) return 1;
    return Math.min(Math.max(Math.trunc(value), 1), Math.max(effectiveMax, 1));
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="quantity" value={quantity} />

      <div>
        <p className="text-sm font-medium mb-2">Quantidade de acessos</p>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {QUICK_OPTIONS.map((qty) => {
            const disabled = qty > effectiveMax;
            return (
              <button
                key={qty}
                type="button"
                disabled={disabled}
                onClick={() => setQuantity(clamp(qty))}
                className={`text-sm text-center py-2 rounded-md border transition-colors ${
                  disabled
                    ? "border-border text-muted/40 cursor-not-allowed"
                    : quantity === qty
                      ? "border-gold bg-gold/10 text-gold-soft cursor-pointer"
                      : "border-border text-muted hover:border-gold/40 hover:text-foreground cursor-pointer"
                }`}
              >
                {qty}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQuantity(clamp(quantity - 1))}
            disabled={quantity <= 1}
            className="h-9 w-9 rounded-md border border-border text-lg text-muted hover:border-gold/40 hover:text-foreground transition-colors disabled:opacity-30 cursor-pointer flex items-center justify-center shrink-0"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={effectiveMax}
            value={quantity}
            onChange={(e) => setQuantity(clamp(Number.parseInt(e.target.value, 10)))}
            className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-center outline-none focus:border-gold/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => setQuantity(clamp(quantity + 1))}
            disabled={quantity >= effectiveMax}
            className="h-9 w-9 rounded-md border border-border text-lg text-muted hover:border-gold/40 hover:text-foreground transition-colors disabled:opacity-30 cursor-pointer flex items-center justify-center shrink-0"
          >
            +
          </button>
        </div>
        <p className="text-xs text-muted mt-1.5 text-right">
          máx. {effectiveMax.toLocaleString("pt-BR")} disponíveis
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface-2 px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-muted">Total</span>
        <span className="text-lg font-semibold text-gold-soft">
          {(total / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
      </div>

      {state.status === "error" && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded-md px-3 py-2">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || effectiveMax <= 0}
        className="w-full py-3.5 rounded-md bg-gold text-background font-semibold hover:bg-gold-soft transition-colors shadow-lg shadow-gold/10 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {pending ? "Gerando Pix…" : "Gerar Pix e reservar acessos"}
      </button>
      <p className="text-xs text-muted text-center">
        Seus números ficam reservados por 10 minutos enquanto o pagamento é processado.
      </p>
    </form>
  );
}
