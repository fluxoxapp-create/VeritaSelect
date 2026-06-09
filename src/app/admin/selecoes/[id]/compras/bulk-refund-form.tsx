"use client";

import { useActionState, useState } from "react";
import { bulkRefundRaffle } from "./actions";

type State = { error: string | null; success?: boolean; count?: number } | undefined;

export function BulkRefundForm({
  raffleId,
  raffleTitle,
  paidCount,
}: {
  raffleId: string;
  raffleTitle: string;
  paidCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(bulkRefundRaffle, undefined as State);

  if (state?.success) {
    return (
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-5 py-4 space-y-1">
        <p className="text-emerald-300 font-medium">
          {state.count} estorno{state.count !== 1 ? "s" : ""} processado{state.count !== 1 ? "s" : ""} com sucesso.
        </p>
        {state.error && <p className="text-sm text-amber-300">{state.error}</p>}
      </div>
    );
  }

  if (paidCount === 0) return null;

  return (
    <>
      <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-red-400">Estorno em massa</p>
          <p className="text-xs text-muted mt-0.5">
            Estorna todas as {paidCount} compras pagas desta seleção e libera as cotas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 px-4 py-2 rounded-md border border-red-400/40 text-red-400 text-sm font-medium hover:bg-red-400/10 transition-colors cursor-pointer"
        >
          Estornar toda a seleção
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 space-y-5 shadow-2xl">
            <div>
              <h2 className="text-lg font-semibold text-red-400">Estornar toda a seleção</h2>
              <p className="text-sm text-muted mt-1">
                Você está prestes a estornar{" "}
                <strong className="text-foreground">{paidCount} compras pagas</strong> de{" "}
                <strong className="text-foreground">{raffleTitle}</strong>. Todos os pagamentos Pix
                serão devolvidos e as cotas liberadas. Esta ação é irreversível.
              </p>
            </div>

            {state?.error && (
              <p className="text-sm text-red-400 bg-red-400/5 border border-red-400/20 rounded-md px-3 py-2">
                {state.error}
              </p>
            )}

            <form action={action} className="space-y-4">
              <input type="hidden" name="raffleId" value={raffleId} />
              <div>
                <label className="text-sm text-muted block mb-1.5">
                  Motivo do estorno em massa <span className="text-red-400">*</span>
                </label>
                <textarea
                  name="reason"
                  required
                  minLength={10}
                  rows={3}
                  placeholder="Ex.: Bug confirmado na apuração do sorteio. Todos os participantes serão reembolsados."
                  className="w-full rounded-md border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-red-400/60 resize-none placeholder:text-muted"
                />
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="px-4 py-2 rounded-md border border-border text-muted text-sm hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  onClick={(e) => {
                    if (
                      !confirm(
                        `Confirma o estorno de TODAS as ${paidCount} compras pagas? Esta ação é irreversível.`,
                      )
                    ) {
                      e.preventDefault();
                    }
                  }}
                  className="px-4 py-2 rounded-md border border-red-400/40 bg-red-400/10 text-red-400 text-sm font-medium hover:bg-red-400/20 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {pending ? "Processando…" : `Estornar ${paidCount} compras`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
