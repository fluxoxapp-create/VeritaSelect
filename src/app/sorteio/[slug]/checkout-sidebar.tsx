"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const QTY_PRESETS = [5, 10, 25, 50];
const MAX_PER_PURCHASE = 500;

export function CheckoutSidebar({
  slug,
  cotaPrice,
  soldCotas,
  totalCotas,
}: {
  slug: string;
  cotaPrice: number;
  soldCotas: number;
  totalCotas: number;
}) {
  const router = useRouter();
  const remaining = Math.max(0, totalCotas - soldCotas);
  const pct = totalCotas > 0 ? Math.min(100, Math.round((soldCotas / totalCotas) * 100)) : 0;
  const maxBuy = Math.min(remaining, MAX_PER_PURCHASE);

  const [quantity, setQuantity] = useState(() => Math.min(10, maxBuy || 1));
  const [mode, setMode] = useState<"random" | "manual">("random");

  const total = cotaPrice * quantity;
  const soldOut = remaining <= 0;

  function clamp(v: number) {
    return Math.max(1, Math.min(maxBuy, v));
  }

  function handleQtyInput(raw: string) {
    const n = parseInt(raw, 10);
    if (!isNaN(n)) setQuantity(clamp(n));
  }

  function handleBuy() {
    router.push(`/sorteio/${slug}/comprar?qty=${quantity}&mode=${mode}`);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-5 lg:sticky lg:top-24">
      <div>
        <p className="text-sm text-muted">Acesso a partir de</p>
        <p className="text-3xl font-semibold text-gold-soft">
          {cotaPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </div>

      <div>
        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold-soft to-gold rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span>{pct}% garantidos</span>
          <span>
            <span className="text-foreground font-medium">{remaining.toLocaleString("pt-BR")}</span>
            {" "}de{" "}
            <span className="text-foreground font-medium">{totalCotas.toLocaleString("pt-BR")}</span>
            {" "}disponíveis
          </span>
        </div>
      </div>

      {soldOut ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-2 p-4 text-center text-sm text-muted">
          Todos os acessos desta seleção já foram garantidos.
        </div>
      ) : (
        <>
          <div>
            <p className="text-sm font-medium mb-2">Quantidade de acessos</p>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {QTY_PRESETS.map((qty) => {
                const disabled = qty > maxBuy;
                return (
                  <button
                    key={qty}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setQuantity(qty)}
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

            {/* Custom quantity input */}
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
                max={maxBuy}
                value={quantity}
                onChange={(e) => handleQtyInput(e.target.value)}
                className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-center outline-none focus:border-gold/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setQuantity(clamp(quantity + 1))}
                disabled={quantity >= maxBuy}
                className="h-9 w-9 rounded-md border border-border text-lg text-muted hover:border-gold/40 hover:text-foreground transition-colors disabled:opacity-30 cursor-pointer flex items-center justify-center shrink-0"
              >
                +
              </button>
            </div>
            <p className="text-xs text-muted mt-1.5 text-right">
              máx. {maxBuy.toLocaleString("pt-BR")} por compra
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <button
              type="button"
              onClick={() => setMode("random")}
              className={`px-3 py-2 rounded-md border text-center cursor-pointer transition-colors ${
                mode === "random"
                  ? "border-gold/60 bg-gold/10 text-gold-soft"
                  : "border-border text-muted hover:border-gold/40 hover:text-foreground"
              }`}
            >
              Números aleatórios
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`px-3 py-2 rounded-md border text-center cursor-pointer transition-colors ${
                mode === "manual"
                  ? "border-gold/60 bg-gold/10 text-gold-soft"
                  : "border-border text-muted hover:border-gold/40 hover:text-foreground"
              }`}
            >
              Escolher manualmente
            </button>
          </div>

          <div className="rounded-lg border border-border bg-surface-2 px-4 py-2.5 flex items-center justify-between text-sm">
            <span className="text-muted">Total ({quantity}× cota)</span>
            <span className="font-semibold text-gold-soft">
              {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>

          <button
            type="button"
            onClick={handleBuy}
            className="block w-full py-3.5 rounded-md bg-gold text-background font-semibold text-center hover:bg-gold-soft transition-colors shadow-lg shadow-gold/10 cursor-pointer"
          >
            Comprar com Pix
          </button>
        </>
      )}

      <div className="flex items-center justify-center gap-4 text-xs text-muted">
        <span>🔒 Pagamento protegido</span>
        <span>⚡ Confirmação em segundos</span>
      </div>
    </div>
  );
}
