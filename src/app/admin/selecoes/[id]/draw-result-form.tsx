"use client";

import { useActionState } from "react";
import { registerDrawResult } from "./actions";

type State = { error: string | null; winningCota?: number } | undefined;

export function DrawResultForm({ raffleId, totalCotas }: { raffleId: string; totalCotas: number }) {
  const [state, action, pending] = useActionState(registerDrawResult, undefined as State);

  const digits = totalCotas <= 100 ? 2 : totalCotas <= 1000 ? 3 : totalCotas <= 10000 ? 4 : 5;

  return (
    <div className="rounded-xl border border-gold/20 bg-gold/5 p-6 space-y-5">
      <div>
        <h3 className="font-semibold text-gold-soft">Registrar resultado oficial</h3>
        <p className="text-sm text-muted mt-1">
          Informe o resultado da Loteria Federal. O sistema usará os últimos{" "}
          <strong className="text-foreground">{digits} dígitos</strong> para determinar o número ganhador.
        </p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-400 bg-red-400/5 border border-red-400/20 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      {state?.winningCota !== undefined && (
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-400/5 px-5 py-4 text-center">
          <p className="text-sm text-emerald-300 font-medium">Ganhador encontrado!</p>
          <p className="text-4xl font-mono font-bold text-emerald-300 mt-2">
            {String(state.winningCota).padStart(digits, "0")}
          </p>
          <p className="text-xs text-muted mt-1">Número vencedor — verifique em Ganhadores</p>
        </div>
      )}

      <form action={action} className="space-y-4">
        <input type="hidden" name="raffleId" value={raffleId} />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted block mb-1.5">
              Resultado Loteria Federal <span className="text-xs">(5 dígitos)</span>
            </label>
            <input
              type="text"
              name="lotteryResult"
              required
              maxLength={5}
              pattern="[0-9]{5}"
              placeholder="Ex.: 04821"
              className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-mono outline-none focus:border-gold/60"
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1.5">
              Concurso <span className="text-xs">(opcional)</span>
            </label>
            <input
              type="text"
              name="concurso"
              placeholder="Ex.: 6001"
              className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="px-6 py-2.5 rounded-md bg-gold text-background text-sm font-semibold hover:bg-gold-soft transition-colors disabled:opacity-60 cursor-pointer"
        >
          {pending ? "Calculando ganhador..." : "Registrar resultado e apurar ganhador"}
        </button>
      </form>
    </div>
  );
}
