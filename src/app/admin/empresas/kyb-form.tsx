"use client";

import { useActionState, useState } from "react";
import { decidirKyb, alternarSeloPendencia } from "./actions";

export function KybForm({ empresaId }: { empresaId: string }) {
  const [modo, setModo] = useState<"escolha" | "reprovar">("escolha");
  const [state, action, pending] = useActionState(decidirKyb, undefined);

  if (state?.ok) return <p className="text-sm text-ok mt-4 pt-4 border-t border-border/60">{state.ok}</p>;

  return (
    <div className="mt-4 pt-4 border-t border-border/60">
      {modo === "escolha" ? (
        <div className="flex flex-wrap gap-2">
          <form action={action}>
            <input type="hidden" name="empresaId" value={empresaId} />
            <input type="hidden" name="decisao" value="aprovada" />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-gold text-background text-xs font-medium px-3 py-1.5 hover:bg-gold-soft transition-colors disabled:opacity-60 cursor-pointer"
            >
              {pending ? "Aprovando..." : "Aprovar KYB"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setModo("reprovar")}
            className="rounded-md border border-border text-xs px-3 py-1.5 text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            Reprovar
          </button>
        </div>
      ) : (
        <form action={action} className="space-y-3">
          <input type="hidden" name="empresaId" value={empresaId} />
          <input type="hidden" name="decisao" value="reprovada" />
          <textarea
            name="motivo"
            rows={3}
            required
            minLength={15}
            placeholder="O que precisa ser corrigido para a empresa reenviar."
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-gold/50"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md border border-erro/50 text-erro text-xs px-3 py-1.5 hover:bg-erro/10 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {pending ? "Registrando..." : "Confirmar reprovação"}
            </button>
            <button
              type="button"
              onClick={() => setModo("escolha")}
              className="text-xs text-muted hover:text-foreground cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      {state?.error && <p className="text-xs text-erro mt-2">{state.error}</p>}
    </div>
  );
}

export function SeloForm({ empresaId, ativo }: { empresaId: string; ativo: boolean }) {
  const [state, action, pending] = useActionState(alternarSeloPendencia, undefined);

  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="empresaId" value={empresaId} />
      <input type="hidden" name="ativar" value={ativo ? "0" : "1"} />
      <button
        type="submit"
        disabled={pending}
        className={`rounded-md border text-xs px-3 py-1.5 transition-colors disabled:opacity-60 cursor-pointer ${
          ativo
            ? "border-border text-muted hover:text-foreground"
            : "border-espera/50 text-espera hover:bg-espera/10"
        }`}
      >
        {pending
          ? "Atualizando..."
          : ativo
            ? "Remover selo de pendência"
            : "Aplicar selo de pendência de pagamento"}
      </button>
      {state?.ok && <p className="text-xs text-ok mt-2">{state.ok}</p>}
      {state?.error && <p className="text-xs text-erro mt-2">{state.error}</p>}
    </form>
  );
}
