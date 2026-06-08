"use client";

import { useActionState } from "react";
import { loginAdmin } from "../actions";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAdmin, undefined);

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <h1 className="text-2xl font-semibold mb-2">Acesso administrativo</h1>
      <p className="text-muted text-sm mb-8">
        Área restrita à equipe VeritaSelect. Todas as tentativas de acesso ficam registradas.
      </p>

      <form action={formAction} className="space-y-4">
        <div>
          <label className="text-sm text-muted block mb-1.5">E-mail</label>
          <input
            type="email"
            name="email"
            required
            placeholder="seuemail@veritaselect.com.br"
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
        </div>
        <div>
          <label className="text-sm text-muted block mb-1.5">Senha</label>
          <input
            type="password"
            name="password"
            required
            placeholder="••••••••"
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-400 border border-red-400/30 rounded-md px-3 py-2">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full py-2.5 rounded-md bg-gold text-background font-medium hover:bg-gold-soft transition-colors disabled:opacity-60"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
