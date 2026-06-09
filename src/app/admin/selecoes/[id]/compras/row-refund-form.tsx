"use client";

import { useActionState } from "react";
import { issueCompraRefund } from "./actions";

type State = { error: string | null; success?: boolean } | undefined;

export function RowRefundForm({
  compraId,
  raffleId,
  totalCents,
  buyerName,
}: {
  compraId: string;
  raffleId: string;
  totalCents: number;
  buyerName: string;
}) {
  const [state, action, pending] = useActionState(issueCompraRefund, undefined as State);

  if (state?.success) {
    return (
      <span className="text-xs text-blue-300 border border-blue-400/40 px-2 py-0.5 rounded-full whitespace-nowrap">
        Estornado
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {state?.error && (
        <p className="text-xs text-red-400 max-w-[160px] text-right">{state.error}</p>
      )}
      <form action={action}>
        <input type="hidden" name="compraId" value={compraId} />
        <input type="hidden" name="raffleId" value={raffleId} />
        <button
          type="submit"
          disabled={pending}
          onClick={(e) => {
            const amount = (totalCents / 100).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            });
            if (
              !confirm(
                `Estornar ${amount} para ${buyerName}?\n\nEsta ação devolve o Pix ao comprador e libera as cotas. Não pode ser desfeita.`,
              )
            ) {
              e.preventDefault();
            }
          }}
          className="text-xs px-3 py-1 rounded-md border border-red-400/40 text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
        >
          {pending ? "…" : "Estornar"}
        </button>
      </form>
    </div>
  );
}
