"use client";

import { useActionState } from "react";
import { addCategory } from "./actions";

type State = { error: string | null } | undefined;

export function AddCategoryForm() {
  const [state, action, pending] = useActionState(addCategory, undefined as State);

  const inputClass = "w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-gold/60";

  return (
    <form action={action} className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-1">
          <label className="text-sm text-muted block mb-1.5">Ícone (emoji)</label>
          <input
            type="text"
            name="icon"
            defaultValue="🏆"
            maxLength={4}
            className={inputClass + " text-center text-xl"}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm text-muted block mb-1.5">Nome</label>
          <input
            type="text"
            name="name"
            required
            placeholder="Ex.: Aviação"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className="text-sm text-muted block mb-1.5">
          Keywords para foto de capa{" "}
          <span className="text-xs">(separadas por vírgula — usadas no loremflickr)</span>
        </label>
        <input
          type="text"
          name="keywords"
          placeholder="Ex.: airplane,aircraft,aviation"
          className={inputClass}
        />
      </div>
      {state?.error && (
        <p className="text-sm text-red-400 bg-red-400/5 border border-red-400/20 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="px-6 py-2 rounded-md bg-gold text-background text-sm font-medium hover:bg-gold-soft transition-colors cursor-pointer disabled:opacity-60"
      >
        {pending ? "Adicionando..." : "Adicionar categoria"}
      </button>
    </form>
  );
}
