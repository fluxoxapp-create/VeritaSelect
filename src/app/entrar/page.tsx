"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "./actions";

const STATUS_MESSAGES: Record<string, string> = {
  redefinida: "Sua senha foi redefinida. Entre com a nova senha abaixo.",
  link_invalido:
    "Esse link expirou ou já foi usado. Solicite um novo link para continuar.",
};

function StatusBanner() {
  const searchParams = useSearchParams();
  const statusKey = searchParams.get("redefinida")
    ? "redefinida"
    : searchParams.get("erro") ?? undefined;
  const statusMessage = statusKey ? STATUS_MESSAGES[statusKey] : undefined;

  if (!statusMessage) return null;

  return (
    <p className="text-sm text-gold-soft border border-gold/30 rounded-md px-3 py-2 mb-4">
      {statusMessage}
    </p>
  );
}

export default function EntrarPage() {
  const [state, formAction, pending] = useActionState(signIn, undefined);

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-2xl font-semibold mb-2">Entrar na sua conta</h1>
      <p className="text-muted text-sm mb-8">
        Acesse seus acessos, acompanhe seleções e receba alertas de novas oportunidades.
      </p>

      <Suspense fallback={null}>
        <StatusBanner />
      </Suspense>

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
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm text-muted">Senha</label>
            <Link href="/recuperar-senha" className="text-xs text-gold-soft hover:text-gold">
              Esqueci minha senha
            </Link>
          </div>
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

      <p className="text-sm text-muted mt-8 text-center">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="text-gold-soft hover:text-gold">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
