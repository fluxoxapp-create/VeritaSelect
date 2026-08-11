"use client";

import { useActionState, useState } from "react";
import { aprovarIndicacao, recusarIndicacao, registrarLiquidacao } from "./actions";
import { MOTIVOS_RECUSA, MOTIVO_RECUSA_INFO, type MotivoRecusa } from "@/lib/domain/indicacoes";

/**
 * Controles de análise. O formulário não é controle de segurança (convenção
 * técnica 7): a lista fechada de motivos e o tamanho mínimo da justificativa
 * são revalidados no servidor, e o tenant nunca vem daqui.
 */
export function AnaliseForm({ indicacaoId }: { indicacaoId: string }) {
  const [modo, setModo] = useState<"escolha" | "recusa">("escolha");
  const [aprovarState, aprovarAction, aprovando] = useActionState(aprovarIndicacao, undefined);
  const [recusarState, recusarAction, recusando] = useActionState(recusarIndicacao, undefined);
  const [motivo, setMotivo] = useState<MotivoRecusa>(MOTIVOS_RECUSA[0]);

  const erro = aprovarState?.error ?? recusarState?.error;
  const ok = aprovarState?.ok ?? recusarState?.ok;

  if (ok) {
    return <p className="text-sm text-ok mt-4 pt-4 border-t border-border/60">{ok}</p>;
  }

  return (
    <div className="mt-4 pt-4 border-t border-border/60">
      {modo === "escolha" ? (
        <div className="flex flex-wrap gap-2">
          <form action={aprovarAction}>
            <input type="hidden" name="indicacaoId" value={indicacaoId} />
            <button
              type="submit"
              disabled={aprovando}
              className="rounded-md bg-gold text-background text-xs font-medium px-3 py-1.5 hover:bg-gold-soft transition-colors disabled:opacity-60 cursor-pointer"
            >
              {aprovando ? "Aprovando..." : "Aprovar"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setModo("recusa")}
            className="rounded-md border border-border text-xs px-3 py-1.5 text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            Recusar
          </button>
        </div>
      ) : (
        <form action={recusarAction} className="space-y-3">
          <input type="hidden" name="indicacaoId" value={indicacaoId} />

          <div>
            <label className="text-xs text-muted block mb-1.5">
              Motivo da recusa (lista fechada)
            </label>
            <select
              name="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as MotivoRecusa)}
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-gold/50"
            >
              {MOTIVOS_RECUSA.map((m) => (
                <option key={m} value={m}>
                  {MOTIVO_RECUSA_INFO[m].label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted mt-1.5">{MOTIVO_RECUSA_INFO[motivo].prova}</p>
          </div>

          <div>
            <label className="text-xs text-muted block mb-1.5">Justificativa</label>
            <textarea
              name="detalhe"
              rows={3}
              minLength={20}
              required
              placeholder="Descreva objetivamente e indique a prova que sustenta a recusa."
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-gold/50"
            />
          </div>

          {erro && <p className="text-xs text-erro">{erro}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={recusando}
              className="rounded-md border border-erro/50 text-erro text-xs px-3 py-1.5 hover:bg-erro/10 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {recusando ? "Registrando..." : "Confirmar recusa"}
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

      {modo === "escolha" && erro && <p className="text-xs text-erro mt-2">{erro}</p>}
    </div>
  );
}

export function LiquidacaoForm({ indicacaoId }: { indicacaoId: string }) {
  const [state, action, pending] = useActionState(registrarLiquidacao, undefined);

  if (state?.ok) {
    return <p className="text-sm text-ok mt-4 pt-4 border-t border-border/60">{state.ok}</p>;
  }

  return (
    <form action={action} className="mt-4 pt-4 border-t border-border/60">
      <input type="hidden" name="indicacaoId" value={indicacaoId} />
      <p className="text-xs text-muted mb-2">
        Já pagou o parceiro? Registre aqui em até 2 dias úteis. O registro não move dinheiro — ele
        declara que o pagamento, feito por meio próprio, aconteceu.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-border text-xs px-3 py-1.5 text-muted hover:text-foreground transition-colors disabled:opacity-60 cursor-pointer"
      >
        {pending ? "Registrando..." : "Registrar liquidação"}
      </button>
      {state?.error && <p className="text-xs text-erro mt-2">{state.error}</p>}
    </form>
  );
}
