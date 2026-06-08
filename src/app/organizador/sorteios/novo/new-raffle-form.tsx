"use client";

import { useActionState } from "react";
import { createRaffleDraft } from "./actions";

const CATEGORIES = ["Agro", "Caminhonetes", "Motos", "Náutico", "Automotivo"] as const;

export function NewRaffleForm() {
  const [state, formAction, pending] = useActionState(createRaffleDraft, undefined);

  return (
    <form action={formAction} className="space-y-5 max-w-xl">
      <div>
        <label className="text-sm text-muted block mb-1.5">Título da seleção</label>
        <input
          type="text"
          name="title"
          required
          placeholder="Ex.: RAM 2500 Limited 0km"
          className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-muted block mb-1.5">Categoria</label>
          <select
            name="category"
            required
            defaultValue=""
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          >
            <option value="" disabled>
              Selecione
            </option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-muted block mb-1.5">Data de apuração</label>
          <input
            type="date"
            name="drawDate"
            required
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-muted block mb-1.5">Valor do acesso (R$)</label>
          <input
            type="text"
            name="cotaPrice"
            required
            placeholder="Ex.: 49,90"
            inputMode="decimal"
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
        </div>
        <div>
          <label className="text-sm text-muted block mb-1.5">Quantidade de acessos</label>
          <input
            type="number"
            name="totalCotas"
            required
            min={1}
            placeholder="Ex.: 20000"
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-muted block mb-1.5">Descrição do prêmio</label>
        <textarea
          name="description"
          required
          rows={5}
          placeholder="Conte os detalhes do prêmio: ano, condição, itens inclusos, procedência..."
          className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60 resize-y"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-400 border border-red-400/30 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="px-6 py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold-soft transition-colors disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar rascunho"}
      </button>
      <p className="text-xs text-muted">
        A seleção é salva como rascunho. Você poderá enviá-la para análise da
        nossa equipe a partir de &quot;Minhas seleções&quot;.
      </p>
    </form>
  );
}
