"use client";

import { useActionState, useState } from "react";
import { decidirDisputa } from "./actions";

/**
 * Só aparece quando a disputa está madura: com resposta da empresa ou com o
 * prazo dela vencido. O servidor revalida as duas condições — o formulário
 * não é controle de segurança (convenção técnica 7).
 */
export function DecisaoForm({
  disputaId,
  silencioDaEmpresa,
}: {
  disputaId: string;
  silencioDaEmpresa: boolean;
}) {
  const [state, action, pending] = useActionState(decidirDisputa, undefined);
  const [decisao, setDecisao] = useState<"procedente" | "improcedente">("procedente");

  if (state?.ok) {
    return <p className="text-sm text-ok mt-4 pt-4 border-t border-border/60">{state.ok}</p>;
  }

  return (
    <form action={action} className="mt-4 pt-4 border-t border-border/60 space-y-3">
      <input type="hidden" name="disputaId" value={disputaId} />

      {silencioDaEmpresa && (
        <p className="text-xs text-espera">
          A empresa não respondeu dentro do prazo. Pela política 06 §7, o silêncio implica
          procedência — improcedência está bloqueada no servidor.
        </p>
      )}

      <div>
        <label className="text-xs text-muted block mb-1.5">Decisão</label>
        <select
          name="decisao"
          value={decisao}
          onChange={(e) => setDecisao(e.target.value as "procedente" | "improcedente")}
          disabled={silencioDaEmpresa}
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-gold/50 disabled:opacity-60"
        >
          <option value="procedente">Procedente — a comissão é devida ao parceiro</option>
          <option value="improcedente">Improcedente — a decisão da empresa se mantém</option>
        </select>
        <p className="text-xs text-muted mt-1.5">
          {decisao === "procedente"
            ? "A indicação volta a aprovada e o prazo de pagamento reinicia pelos prazos da campanha."
            : "A indicação volta ao status que tinha antes da contestação."}
        </p>
      </div>

      <div>
        <label className="text-xs text-muted block mb-1.5">
          Fundamentação — citar a prova, na ordem de peso acima
        </label>
        <textarea
          name="fundamentacao"
          rows={4}
          minLength={30}
          required
          placeholder="Ex.: o log mostra registro em 04/08 14h32; o documento apresentado pela empresa é datado de 19/08, posterior. Recusa por lead preexistente não se sustenta."
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-gold/50"
        />
        <p className="text-xs text-espera mt-1.5">
          A fundamentação é lida pelas duas partes. Não insira dado sensível nem informação de
          terceiro que não seja necessária para sustentar a decisão.
        </p>
      </div>

      {state?.error && <p className="text-xs text-erro">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gold text-background text-xs font-medium px-3 py-1.5 hover:bg-gold-soft transition-colors disabled:opacity-60 cursor-pointer"
      >
        {pending ? "Registrando decisão..." : "Registrar decisão"}
      </button>
    </form>
  );
}
