"use client";

import { Suspense, useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { validarPin } from "./actions";

function PinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";
  const [state, action, pending] = useActionState(validarPin, undefined);

  useEffect(() => {
    if (state?.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="text-sm text-muted block mb-1.5" htmlFor="pin">
          PIN operacional
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          required
          className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-center text-lg tracking-[0.5em] font-mono outline-none focus:border-gold/60"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-erro border border-erro/30 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !!state?.redirectTo}
        className="w-full py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold-soft transition-colors disabled:opacity-60 cursor-pointer"
      >
        {pending || state?.redirectTo ? "Verificando..." : "Liberar acesso"}
      </button>
    </form>
  );
}

export default function AdminPinPage() {
  return (
    <div className="mx-auto max-w-sm px-6 py-24">
      <p className="text-xs uppercase tracking-wide text-erro">Segundo fator</p>
      <h1 className="text-xl font-semibold mt-2 mb-2">Confirme o PIN</h1>
      <p className="text-sm text-muted mb-8">
        Esta área decide quem pode transacionar na plataforma e toca no nosso único fluxo
        financeiro. A sessão liberada vale por 2 horas.
      </p>
      <Suspense fallback={null}>
        <PinForm />
      </Suspense>
    </div>
  );
}
