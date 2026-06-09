"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const QTY_OPTIONS = [5, 10, 25, 50];

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

  const [quantity, setQuantity] = useState(() => {
    const defaultQty = QTY_OPTIONS[1] ?? 5;
    return Math.min(defaultQty, remaining || 1);
  });
  const [mode, setMode] = useState<"random" | "manual">("random");

  const total = cotaPrice * quantity;
  const soldOut = remaining <= 0;

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
        <p className="mt-2 text-xs text-muted">
          {pct}% dos acessos garantidos
          {remaining > 0 && (
            <> · <span className="text-foreground font-medium">{remaining.toLocaleString("pt-BR")}</span> restantes</>
          )}
        </p>
      </div>

      {soldOut ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-2 p-4 text-center text-sm text-muted">
          Todos os acessos desta seleção já foram garantidos.
        </div>
      ) : (
        <>
          <div>
            <p className="text-sm font-medium mb-2">Quantidade de acessos</p>
            <div className="grid grid-cols-4 gap-2">
              {QTY_OPTIONS.map((qty) => {
                const disabled = qty > remaining;
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
            <span className="text-muted">Total</span>
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
        <span className="flex items-center gap-1">🔒 Pagamento protegido</span>
        <span className="flex items-center gap-1">⚡ Confirmação em segundos</span>
      </div>
    </div>
  );
}
