"use client";

import Link from "next/link";
import { useActionState } from "react";
import { completePasswordReset } from "./actions";

export default function RedefinirSenhaPage() {
  const [state, formAction, pending] = useActionState(completePasswordReset, undefined);

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-2xl font-semibold mb-2">Criar nova senha</h1>
      <p className="text-muted text-sm mb-8">
        Você está aqui porque clicou em um link de redefinição enviado para o
        seu e-mail. Escolha uma nova senha para sua conta.
      </p>

      <form action={formAction} className="space-y-4">
        <div>
          <label className="text-sm text-muted block mb-1.5">Nova senha</label>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            placeholder="••••••••"
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
        </div>
        <div>
          <label className="text-sm text-muted block mb-1.5">Confirmar nova senha</label>
          <input
            type="password"
            name="confirmPassword"
            required
            minLength={8}
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
          {pending ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>

      <p className="text-sm text-muted mt-8 text-center">
        Link expirado ou inválido?{" "}
        <Link href="/recuperar-senha" className="text-gold-soft hover:text-gold">
          Solicitar novo link
        </Link>
      </p>
    </div>
  );
}
