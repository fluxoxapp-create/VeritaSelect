"use client";

import { useActionState, useState } from "react";
import { addPrize } from "./actions";

const REVEAL_OPTIONS = [
  { value: 0,   label: "Revelado imediatamente (antes da venda)" },
  { value: 25,  label: "Revelado após 25% vendidos" },
  { value: 50,  label: "Revelado após 50% vendidos" },
  { value: 75,  label: "Revelado após 75% vendidos" },
  { value: 100, label: "Revelado só após encerramento" },
];

type State = { error: string | null } | undefined;

export function PrizesForm({ raffleId, totalCotas }: { raffleId: string; totalCotas: number }) {
  const [state, action, pending] = useActionState(addPrize, undefined as State);
  const [prizeNumber, setPrizeNumber] = useState("");
  const [description, setDescription] = useState("");
  const [revealAtPct, setRevealAtPct] = useState(0);

  const inputClass = "w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-gold/60 transition-colors";

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="raffleId" value={raffleId} />
      <input type="hidden" name="revealAtPct" value={revealAtPct} />

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-muted block mb-1.5">
            Número premiado <span className="text-xs">(1 – {totalCotas.toLocaleString("pt-BR")})</span>
          </label>
          <input
            type="number"
            name="prizeNumber"
            required
            min={1}
            max={totalCotas}
            value={prizeNumber}
            onChange={(e) => setPrizeNumber(e.target.value)}
            placeholder="Ex.: 4821"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm text-muted block mb-1.5">Descrição do prêmio instantâneo</label>
          <input
            type="text"
            name="description"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Teclado Gamer HyperX"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-muted block mb-2">Quando revelar este número</label>
        <div className="grid sm:grid-cols-2 gap-2">
          {REVEAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRevealAtPct(opt.value)}
              className={`text-left px-4 py-2.5 rounded-md border text-sm transition-colors cursor-pointer ${
                revealAtPct === opt.value
                  ? "border-gold/60 bg-gold/10 text-gold-soft"
                  : "border-border text-muted hover:border-gold/40 hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted mt-2">
          Enquanto não revelado, o número fica oculto — compradores não sabem qual número é premiado.
        </p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-400 bg-red-400/5 border border-red-400/20 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="px-6 py-2.5 rounded-md bg-gold text-background text-sm font-medium hover:bg-gold-soft transition-colors disabled:opacity-60 cursor-pointer"
      >
        {pending ? "Adicionando..." : "Adicionar número premiado"}
      </button>
    </form>
  );
}
