"use client";

import { useActionState, useState } from "react";
import { aprovarHabilitacao, reprovarHabilitacao } from "./actions";

export function VerificacaoForm({ habilitacaoId }: { habilitacaoId: string }) {
  const [modo, setModo] = useState<"escolha" | "reprovar">("escolha");
  const [aprovar, aprovarAction, aprovando] = useActionState(aprovarHabilitacao, undefined);
  const [reprovar, reprovarAction, reprovando] = useActionState(reprovarHabilitacao, undefined);

  const ok = aprovar?.ok ?? reprovar?.ok;
  const erro = aprovar?.error ?? reprovar?.error;

  if (ok) return <p className="text-sm text-ok mt-4 pt-4 border-t border-border/60">{ok}</p>;

  return (
    <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
      {modo === "escolha" ? (
        <form action={aprovarAction} className="space-y-3">
          <input type="hidden" name="habilitacaoId" value={habilitacaoId} />
          <div>
            <label className="text-xs text-muted block mb-1.5">
              Fonte consultada (obrigatório)
            </label>
            <input
              name="fonteConsultada"
              required
              minLength={8}
              placeholder="Consulta pública SUSEP, protocolo 123, em 10/08/2026"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-gold/50"
            />
            <p className="text-xs text-muted mt-1.5">
              Registrada no log de auditoria. É ela que sustenta a liberação se for questionada.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={aprovando}
              className="rounded-md bg-gold text-background text-xs font-medium px-3 py-1.5 hover:bg-gold-soft transition-colors disabled:opacity-60 cursor-pointer"
            >
              {aprovando ? "Aprovando..." : "Aprovar credencial"}
            </button>
            <button
              type="button"
              onClick={() => setModo("reprovar")}
              className="rounded-md border border-border text-xs px-3 py-1.5 text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              Reprovar
            </button>
          </div>
          {erro && <p className="text-xs text-erro">{erro}</p>}
        </form>
      ) : (
        <form action={reprovarAction} className="space-y-3">
          <input type="hidden" name="habilitacaoId" value={habilitacaoId} />
          <div>
            <label className="text-xs text-muted block mb-1.5">Motivo da reprovação</label>
            <textarea
              name="motivo"
              rows={3}
              required
              minLength={15}
              placeholder="Ex.: registro não localizado na consulta pública do CRECI-SP; número informado pertence a outro inscrito."
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-gold/50"
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1.5">Fonte consultada</label>
            <input
              name="fonteConsultada"
              placeholder="Consulta pública do conselho, data e protocolo"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-gold/50"
            />
          </div>
          {erro && <p className="text-xs text-erro">{erro}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={reprovando}
              className="rounded-md border border-erro/50 text-erro text-xs px-3 py-1.5 hover:bg-erro/10 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {reprovando ? "Registrando..." : "Confirmar reprovação"}
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
    </div>
  );
}
