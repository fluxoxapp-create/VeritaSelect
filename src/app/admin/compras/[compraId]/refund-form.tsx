"use client";

import { useActionState } from "react";
import { issueRefund } from "./actions";

type State = { error: string | null; success?: boolean } | undefined;

export function RefundForm({ compraId, totalCents }: { compraId: string; totalCents: number }) {
  const [state, action, pending] = useActionState(issueRefund, undefined as State);

  if (state?.success) {
    return (
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-5 py-4 text-center space-y-1">
        <p className="text-emerald-300 font-medium">Estorno realizado com sucesso</p>
        <p className="text-xs text-muted">O valor foi devolvido ao comprador via Pix.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-red-400">Estornar compra</h3>
        <p className="text-sm text-muted mt-1">
          Valor a devolver:{" "}
          <strong className="text-foreground">
            {(totalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </strong>
          . Esta ação é irreversível.
        </p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-400 bg-red-400/5 border border-red-400/20 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <form action={action}>
        <input type="hidden" name="compraId" value={compraId} />
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 rounded-md border border-red-400/40 text-red-400 text-sm font-medium hover:bg-red-400/10 transition-colors cursor-pointer disabled:opacity-60"
          onClick={(e) => {
            if (!confirm("Confirma o estorno completo desta compra? Esta ação não pode ser desfeita.")) {
              e.preventDefault();
            }
          }}
        >
          {pending ? "Processando estorno..." : "Confirmar estorno"}
        </button>
      </form>
    </div>
  );
}
