"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "./actions";

const GENERIC_SENT_MESSAGE =
  "Se existir uma conta com este e-mail, enviamos um link para redefinir a senha. " +
  "Confira sua caixa de entrada (e o spam) — o link expira em pouco tempo.";

export default function RecuperarSenhaPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, undefined);

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-2xl font-semibold mb-2">Esqueci minha senha</h1>
      <p className="text-muted text-sm mb-8">
        Informe o e-mail da sua conta. Se ele estiver cadastrado, você vai
        receber um link seguro para criar uma nova senha.
      </p>

      {state?.sent ? (
        <div className="rounded-md border border-gold/40 bg-surface p-4 text-sm">
          {GENERIC_SENT_MESSAGE}
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <div>
            <label className="text-sm text-muted block mb-1.5">E-mail</label>
            <input
              type="email"
              name="email"
              required
              placeholder="voce@email.com"
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
            {pending ? "Enviando..." : "Enviar link de redefinição"}
          </button>
        </form>
      )}

      <p className="text-sm text-muted mt-8 text-center">
        Lembrou sua senha?{" "}
        <Link href="/entrar" className="text-gold-soft hover:text-gold">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
