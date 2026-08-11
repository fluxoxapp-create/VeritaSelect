"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { abrirDisputa } from "./actions";
import { PRAZOS_FIXOS } from "@/lib/domain/indicacoes";

export function ContestarForm({ indicacaoId }: { indicacaoId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(abrirDisputa, undefined);

  useEffect(() => {
    if (state?.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  const bloqueado = pending || !!state?.redirectTo;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="indicacaoId" value={indicacaoId} />

      <div>
        <label htmlFor="motivo" className="text-sm font-medium block mb-1.5">
          Por que a decisão está errada?
        </label>
        <p className="text-xs text-muted mb-2">
          Aponte fatos e datas. O log da plataforma é a prova de maior peso — se o registro da sua
          indicação é anterior ao que a empresa alega, diga isso e cite a data.
        </p>
        <textarea
          id="motivo"
          name="motivo"
          rows={7}
          minLength={30}
          required
          placeholder="Ex.: registrei este lead em 04/08 às 14h32 e a empresa alega base preexistente sem apresentar documento anterior a essa data."
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-gold/50"
        />
        <p className="text-xs text-espera mt-1.5">
          Não insira dado sensível: saúde, biometria, origem racial, opinião política, convicção
          religiosa, filiação sindical ou dado de menor de 18 anos.
        </p>
      </div>

      {state?.error && <p className="text-sm text-erro">{state.error}</p>}

      <button
        type="submit"
        disabled={bloqueado}
        className="rounded-md bg-gold text-background font-medium px-5 py-2.5 hover:bg-gold-soft transition-colors disabled:opacity-50 cursor-pointer"
      >
        {bloqueado ? "Registrando contestação..." : "Abrir contestação"}
      </button>

      <p className="text-xs text-muted">
        A empresa tem {PRAZOS_FIXOS.respostaEmpresaDias} dias para responder. Se ela não responder,
        a contestação é considerada procedente. A decisão da plataforma sai em até{" "}
        {PRAZOS_FIXOS.decisaoPlataformaDiasUteis} dias úteis, é administrativa e não vinculante:
        você não abre mão de nenhuma via judicial ao usar este canal.
      </p>
    </form>
  );
}
