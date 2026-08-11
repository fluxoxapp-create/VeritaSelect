"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { aderirCampanha } from "./actions";

export function AderirForm({ slug, podeAderir }: { slug: string; podeAderir: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(aderirCampanha, undefined);

  useEffect(() => {
    if (state?.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  if (!podeAderir) {
    return (
      <p className="mt-6 text-sm text-espera">
        Esta campanha não está aceitando novas adesões no momento.
      </p>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-4 max-w-2xl">
      <input type="hidden" name="slug" value={slug} />

      <label className="flex gap-3 text-sm text-muted cursor-pointer">
        <input type="checkbox" name="aceite" className="mt-1 shrink-0" />
        <span>
          Li e aceito o Contrato de Campanha acima. Entendo que atuo como parceiro comercial
          autônomo, que <strong className="text-foreground">indico e não fecho negócios</strong>, e
          que a comissão me é paga diretamente pela empresa.
        </span>
      </label>

      {state?.error && (
        <p className="text-sm text-erro border border-erro/30 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !!state?.redirectTo}
        className="rounded-md bg-gold text-background font-medium px-5 py-2.5 hover:bg-gold-soft transition-colors disabled:opacity-50 cursor-pointer"
      >
        {pending || state?.redirectTo ? "Registrando adesão..." : "Aderir à campanha"}
      </button>

      <p className="text-xs text-muted">
        Sem exclusividade e sem multa. Você encerra a adesão quando quiser — indicações já
        registradas continuam valendo dentro da janela de atribuição.
      </p>
    </form>
  );
}
