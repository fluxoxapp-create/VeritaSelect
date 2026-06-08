"use client";

import { useActionState } from "react";
import { requestOrganizerVerification } from "./actions";

export function RequestForm() {
  const [state, formAction, pending] = useActionState(requestOrganizerVerification, undefined);

  return (
    <form action={formAction} className="space-y-5 max-w-xl">
      <div>
        <label className="text-sm text-muted block mb-1.5">Nome de exibição</label>
        <input
          type="text"
          name="displayName"
          required
          placeholder="Como seu nome/marca aparecerá para compradores"
          className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-muted block mb-1.5">Tipo de documento</label>
          <select
            name="documentType"
            required
            defaultValue=""
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          >
            <option value="" disabled>
              Selecione
            </option>
            <option value="cpf">CPF (pessoa física)</option>
            <option value="cnpj">CNPJ (pessoa jurídica)</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-muted block mb-1.5">Número do documento</label>
          <input
            type="text"
            name="documentNumber"
            required
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
        </div>
      </div>

      <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
        Após o envio, nossa equipe entrará em contato para solicitar os
        documentos do prêmio e dados de recebimento.
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
        {pending ? "Enviando..." : "Enviar para análise"}
      </button>
      <p className="text-xs text-muted">
        Nossa equipe analisa cada solicitação em até 5 dias úteis. Você será
        notificado por e-mail sobre o status da verificação.
      </p>
    </form>
  );
}
