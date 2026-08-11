"use client";

import { useActionState } from "react";
import { responderDisputa } from "./actions";

export function RespostaForm({ disputaId }: { disputaId: string }) {
  const [state, action, pending] = useActionState(responderDisputa, undefined);

  if (state?.ok) {
    return <p className="text-sm text-ok mt-4 pt-4 border-t border-border/60">{state.ok}</p>;
  }

  return (
    <form action={action} className="mt-4 pt-4 border-t border-border/60 space-y-3">
      <input type="hidden" name="disputaId" value={disputaId} />

      <div>
        <label className="text-xs text-muted block mb-1.5">
          Sua resposta — aponte a prova que sustenta a decisão
        </label>
        <textarea
          name="resposta"
          rows={5}
          minLength={30}
          required
          placeholder="Ex.: o contato consta no nosso CRM desde 12/07, antes do registro da indicação; print e exportação anexados por e-mail ao suporte."
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-gold/50"
        />
        <p className="text-xs text-espera mt-1.5">
          Não insira dado sensível: saúde, biometria, origem racial, opinião política, convicção
          religiosa, filiação sindical ou dado de menor de 18 anos.
        </p>
      </div>

      {state?.error && <p className="text-xs text-erro">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gold text-background text-xs font-medium px-3 py-1.5 hover:bg-gold-soft transition-colors disabled:opacity-60 cursor-pointer"
      >
        {pending ? "Registrando..." : "Responder contestação"}
      </button>
    </form>
  );
}
